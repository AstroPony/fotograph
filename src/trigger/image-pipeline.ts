import { task, logger } from "@trigger.dev/sdk";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { sendUsageAlert } from "@/lib/resend";
import { SCENE_MAP, LEGACY_SCENE_IDS } from "@/lib/scenes";
import sharp from "sharp";
import { randomUUID } from "crypto";

const PHOTOROOM_MONTHLY_LIMIT = 1000;
const ALERT_THRESHOLDS = [0.70, 0.85, 0.95];

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const SIZE   = 1024;
const OUTPUT_SIZE = 1200; // Bol.com minimum

// Product fits a larger portion of the frame for clean solid backgrounds
// (product should be prominent on white/gray). Lifestyle scenes use a
// smaller product so the generated background provides visible context.
const PRODUCT_MAX_SOLID     = Math.round(SIZE * 0.78); // ~799px
const PRODUCT_MAX_GENERATED = Math.round(SIZE * 0.58); // ~594px

export const imagePipelineTask = task({
  id: "image-pipeline",
  maxDuration: 300,

  run: async (payload: {
    imageId:      string;
    rawR2Key:     string;
    sceneTheme:   string;
    customPrompt: string;
  }) => {
    const { imageId, rawR2Key, sceneTheme, customPrompt } = payload;

    const resolvedTheme = LEGACY_SCENE_IDS[sceneTheme] ?? sceneTheme;
    const scene = SCENE_MAP[resolvedTheme];
    if (!scene) throw new Error(`Unknown scene theme: ${sceneTheme}`);

    if (!BUCKET)                              throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set");
    if (!process.env.PHOTOROOM_API_KEY)       throw new Error("PHOTOROOM_API_KEY is not set");
    if (!process.env.REPLICATE_API_TOKEN)     throw new Error("REPLICATE_API_TOKEN is not set");

    const TIER_OUTPUT_SIZE: Record<string, number> = {
      FREE:     512,
      STARTER:  1024,
      PRO:      OUTPUT_SIZE,
      BUSINESS: OUTPUT_SIZE,
    };

    try {
      // 0. Fetch user tier upfront
      const { userId, user } = await prisma.image.findUniqueOrThrow({
        where:  { id: imageId },
        select: { userId: true, user: { select: { tier: true } } },
      });
      const userTier = user.tier as string;
      const outSize  = TIER_OUTPUT_SIZE[userTier] ?? OUTPUT_SIZE;

      // 1. Download raw image from R2
      logger.info("Downloading raw image", { rawR2Key });
      const rawObj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: rawR2Key }));
      if (!rawObj.Body) throw new Error(`R2 object body missing for key: ${rawR2Key}`);
      const rawBuffer = Buffer.from(await rawObj.Body.transformToByteArray());

      // 2. Background removal via Photoroom → transparent PNG
      logger.info("Removing background");
      await prisma.image.update({ where: { id: imageId }, data: { status: "REMOVING_BG" } });

      const formData = new FormData();
      formData.append("image_file", new Blob([rawBuffer], { type: "image/png" }), "image.png");

      const photoroomRes = await fetch("https://sdk.photoroom.com/v1/segment", {
        method:  "POST",
        headers: { "x-api-key": process.env.PHOTOROOM_API_KEY! },
        body:    formData,
      });
      if (!photoroomRes.ok) {
        throw new Error(`Photoroom error ${photoroomRes.status}: ${await photoroomRes.text()}`);
      }

      const bgRemovedBuffer = Buffer.from(await photoroomRes.arrayBuffer());
      const bgRemovedKey    = `bg-removed/${imageId}/${randomUUID()}.png`;

      await r2.send(new PutObjectCommand({
        Bucket:      BUCKET,
        Key:         bgRemovedKey,
        Body:        bgRemovedBuffer,
        ContentType: "image/png",
      }));

      await prisma.image.update({
        where: { id: imageId },
        data:  { bgRemovedR2Key: bgRemovedKey, status: "GENERATING" },
      });

      // Monthly Photoroom usage alert
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const usedThisMonth = await prisma.image.count({
        where: { createdAt: { gte: startOfMonth }, status: { in: ["GENERATING", "DONE"] } },
      });
      const usageRatio = usedThisMonth / PHOTOROOM_MONTHLY_LIMIT;
      const crossed = ALERT_THRESHOLDS.find(
        (t) => usageRatio >= t && (usedThisMonth - 1) / PHOTOROOM_MONTHLY_LIMIT < t
      );
      if (crossed) {
        sendUsageAlert(usedThisMonth, PHOTOROOM_MONTHLY_LIMIT).catch(() => null);
        logger.info("Usage alert sent", { usedThisMonth, threshold: crossed });
      }

      // 3. Resize product cutout and compute placement.
      // Solid backgrounds: product fills most of the frame (prominent, Bol.com style).
      // Generated backgrounds: smaller product leaves visible scene context.
      // Vertical: centred for solid, bottom-anchored at 76% for lifestyle.
      const productMax = scene.generated ? PRODUCT_MAX_GENERATED : PRODUCT_MAX_SOLID;

      const productFit = await sharp(bgRemovedBuffer)
        .resize(productMax, productMax, { fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer();
      const { width: pw, height: ph } = await sharp(productFit).metadata();
      const pLeft = Math.round((SIZE - pw!) / 2);
      const pTop  = scene.generated
        ? Math.round(SIZE * 0.76 - ph!)  // sits on scene surface
        : Math.round((SIZE - ph!) / 2);  // centred on clean background

      // 4. Generate background.
      // Solid scenes: Sharp creates the colour canvas instantly — no AI credits used.
      // Generated scenes: FLUX Schnell (text-to-image) — fast (~3–5 s) and cheap.
      logger.info("Generating background", { sceneTheme, generated: scene.generated });

      let bgBuffer: Buffer;

      if (!scene.generated) {
        bgBuffer = await sharp({
          create: { width: SIZE, height: SIZE, channels: 3, background: scene.bgColor },
        }).png().toBuffer();
      } else {
        const basePrompt = scene.prompt;
        const finalPrompt = customPrompt
          ? `${basePrompt}, ${customPrompt}. No text, no people, no props.`
          : `${basePrompt}. No text, no people, no props.`;

        const schnellBody = JSON.stringify({
          input: {
            prompt:               finalPrompt,
            width:                SIZE,
            height:               SIZE,
            num_outputs:          1,
            num_inference_steps:  4,
            output_format:        "png",
          },
        });

        let startRes!: Response;
        for (let attempt = 0; attempt <= 8; attempt++) {
          startRes = await fetch(
            "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
            {
              method:  "POST",
              headers: {
                Authorization:  `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: schnellBody,
            }
          );
          if (startRes.status !== 429) break;
          const rl = await startRes.json().catch(() => ({}));
          const waitSecs = (rl.retry_after as number | undefined) ?? 10;
          logger.warn("Replicate rate limited, retrying", { waitSecs, attempt: attempt + 1 });
          await new Promise((r) => setTimeout(r, waitSecs * 1000));
        }

        if (!startRes.ok) {
          throw new Error(`Replicate start error: ${await startRes.text()}`);
        }

        let prediction = await startRes.json();

        // Schnell is fast (~3–5 s); poll every 1 s with a 60 s timeout
        const maxPolls = 60;
        let polls = 0;
        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
          if (polls++ >= maxPolls) throw new Error("Replicate prediction timed out after 60 s");
          await new Promise((r) => setTimeout(r, 1000));
          const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
          });
          if (!pollRes.ok) throw new Error(`Replicate poll error ${pollRes.status}`);
          prediction = await pollRes.json();
          logger.info("Prediction status", { status: prediction.status, polls });
        }

        if (prediction.status === "failed") {
          throw new Error(`Replicate prediction failed: ${prediction.error}`);
        }

        const rawOutput = prediction.output;
        const outputUrl = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
        if (typeof outputUrl !== "string") throw new Error("Replicate returned no output URL");
        const bgRes = await fetch(outputUrl);
        if (!bgRes.ok) throw new Error(`Failed to download Replicate output: ${bgRes.status}`);
        bgBuffer = Buffer.from(await bgRes.arrayBuffer());
      }

      // 5. Add contact shadow to the clean cutout via Photoroom Shadow API,
      //    then composite product onto the background.
      //    Gracefully falls back to no shadow on error.
      logger.info("Adding contact shadow via Photoroom");

      let productToComposite = productFit;
      const shadowForm = new FormData();
      shadowForm.append("imageFile", new Blob([new Uint8Array(productFit)], { type: "image/png" }), "product.png");
      shadowForm.append("shadow.mode", "ai.soft");

      const shadowRes = await fetch("https://image-api.photoroom.com/v2/edit", {
        method:  "POST",
        headers: { "x-api-key": process.env.PHOTOROOM_API_KEY! },
        body:    shadowForm,
      });

      if (shadowRes.ok) {
        productToComposite = Buffer.from(await shadowRes.arrayBuffer());
        logger.info("Shadow applied");
      } else {
        logger.warn("Photoroom shadow skipped", { status: shadowRes.status });
      }

      logger.info("Compositing product onto background");
      const composited = await sharp(bgBuffer)
        .resize(SIZE, SIZE, { fit: "cover" })
        .composite([{ input: productToComposite, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      // 6. Tier-aware output sizing + free-tier watermark + EU AI Act EXIF
      logger.info("Resizing output", { userTier, outSize });

      let outputBuffer = await sharp(composited)
        .resize(outSize, outSize, { fit: "fill" })
        .toBuffer();

      if (userTier === "FREE") {
        const barH  = Math.round(outSize * 0.08);
        const fSize = Math.round(outSize * 0.028);
        const wmSvg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${outSize}" height="${outSize}">` +
          `<rect x="0" y="${outSize - barH}" width="${outSize}" height="${barH}" fill="#000000" fill-opacity="0.5"/>` +
          `<text x="${outSize / 2}" y="${outSize - barH / 2}" dominant-baseline="central" text-anchor="middle" ` +
          `font-family="Arial, Helvetica, sans-serif" font-size="${fSize}" font-weight="bold" ` +
          `letter-spacing="2" fill="#ffffff" fill-opacity="0.9">FOTOGRAPH.NL</text>` +
          `</svg>`
        );
        outputBuffer = await sharp(outputBuffer)
          .composite([{ input: wmSvg, top: 0, left: 0 }])
          .png()
          .toBuffer();
      }

      const withExif = await sharp(outputBuffer)
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: "AI-generated product photo by Fotograph",
              Software:         "Fotograph — FLUX Schnell via Replicate",
              Artist:           "Fotograph AI",
            },
          },
        })
        .jpeg({ quality: 92 })
        .toBuffer();

      const previewKey = `previews/${imageId}/${randomUUID()}.jpg`;

      await r2.send(new PutObjectCommand({
        Bucket:      BUCKET,
        Key:         previewKey,
        Body:        withExif,
        ContentType: "image/jpeg",
      }));

      // 7. Mark done, deduct one credit
      await prisma.$transaction([
        prisma.image.update({
          where: { id: imageId },
          data:  { status: "DONE", previewR2Keys: [previewKey] },
        }),
        prisma.user.update({
          where: { id: userId },
          data:  { creditsLeft: { decrement: 1 } },
        }),
      ]);

      logger.info("Pipeline complete", { imageId, previewKey });
      return { imageId, previewKey };
    } catch (error) {
      logger.error("Pipeline failed", { imageId, error: String(error) });
      await prisma.image.update({ where: { id: imageId }, data: { status: "FAILED" } });
      throw error;
    }
  },
});
