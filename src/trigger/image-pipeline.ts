import { task, logger } from "@trigger.dev/sdk";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { sendUsageAlert } from "@/lib/resend";
import { SCENE_THEMES } from "@/lib/scenes";
import sharp from "sharp";
import { randomUUID } from "crypto";

const SCENE_PROMPTS = Object.fromEntries(SCENE_THEMES.map((t) => [t.id, t.prompt]));

const PHOTOROOM_MONTHLY_LIMIT = 1000;
const ALERT_THRESHOLDS = [0.70, 0.85, 0.95];

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const SIZE = 1024;          // FLUX Fill working resolution
const OUTPUT_SIZE = 1200;   // Bol.com minimum (1200×1200px for zoom)
const PRODUCT_MAX = Math.round(SIZE * 0.58); // ~594px — leaves generous scene room

export const imagePipelineTask = task({
  id: "image-pipeline",
  maxDuration: 300,

  run: async (payload: {
    imageId: string;
    rawR2Key: string;
    sceneTheme: string;
    customPrompt: string;
  }) => {
    const { imageId, rawR2Key, sceneTheme, customPrompt } = payload;

    // Build final prompt: scene template + optional user addition
    const sceneBase = SCENE_PROMPTS[sceneTheme] ?? "";
    const finalPrompt = customPrompt
      ? `${sceneBase} ${customPrompt}`.trim()
      : sceneBase;

    if (!BUCKET) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set");
    if (!process.env.PHOTOROOM_API_KEY) throw new Error("PHOTOROOM_API_KEY is not set");
    if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not set");

    try {
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
        method: "POST",
        headers: { "x-api-key": process.env.PHOTOROOM_API_KEY! },
        body: formData,
      });
      if (!photoroomRes.ok) {
        throw new Error(`Photoroom error ${photoroomRes.status}: ${await photoroomRes.text()}`);
      }

      const bgRemovedBuffer = Buffer.from(await photoroomRes.arrayBuffer());
      const bgRemovedKey = `bg-removed/${imageId}/${randomUUID()}.png`;

      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: bgRemovedKey,
        Body: bgRemovedBuffer,
        ContentType: "image/png",
      }));

      await prisma.image.update({
        where: { id: imageId },
        data: { bgRemovedR2Key: bgRemovedKey, status: "GENERATING" },
      });

      // Check monthly Photoroom usage and alert at thresholds
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

      // 3. Prepare image + mask for FLUX Fill inpainting
      logger.info("Preparing inpainting canvas and mask");

      // Resize product to fit within PRODUCT_MAX×PRODUCT_MAX, preserve aspect ratio
      const productFit = await sharp(bgRemovedBuffer)
        .resize(PRODUCT_MAX, PRODUCT_MAX, { fit: "inside" })
        .png()
        .toBuffer();
      const { width: pw, height: ph } = await sharp(productFit).metadata();
      const pLeft = Math.round((SIZE - pw!) / 2);
      const pTop = Math.round((SIZE - ph!) / 2);

      // FLUX Fill requires a flat RGB image (no alpha channel).
      // Transparent pixels become neutral gray — a color that doesn't bias generation.
      const canvasRGB = await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 128, g: 128, b: 128 } },
      })
        .composite([{ input: productFit, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      // Build mask from the transparent PNG (RGBA) separately:
      //   1. Extract alpha — product=255, background=0
      //   2. threshold(128) — binary edge: eliminates Photoroom's feathered semi-transparent pixels
      //   3. negate — product=0 (keep), background=255 (generate)
      //   4. dilate AFTER negate — expands the generate-background zone ~2px into product boundary
      //      so FLUX fills right up to and slightly under the product edge; the clean product
      //      is composited back on top in step 5, giving pixel-perfect edges regardless of FLUX.
      const productAlpha = await sharp({
        create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite([{ input: productFit, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      const mask = await sharp(productAlpha)
        .extractChannel("alpha")
        .threshold(128)
        .negate()
        .dilate()
        .png()
        .toBuffer();

      const imageB64 = `data:image/png;base64,${canvasRGB.toString("base64")}`;
      const maskB64 = `data:image/png;base64,${mask.toString("base64")}`;

      // 4. FLUX Fill inpainting — generates the scene around the product naturally
      logger.info("Generating scene with FLUX Fill inpainting");

      const startRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-dev/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              image: imageB64,
              mask: maskB64,
              prompt: finalPrompt,
              guidance: 30,
              num_inference_steps: 28,
              num_outputs: 1,
              output_format: "webp",
              output_quality: 90,
            },
          }),
        }
      );
      if (!startRes.ok) {
        throw new Error(`Replicate start error: ${await startRes.text()}`);
      }

      let prediction = await startRes.json();

      // Poll until done (max 3 minutes — Fill is slower than Schnell)
      const maxPolls = 72;
      let polls = 0;
      while (prediction.status !== "succeeded" && prediction.status !== "failed") {
        if (polls++ >= maxPolls) throw new Error("Replicate prediction timed out after 3 minutes");
        await new Promise((resolve) => setTimeout(resolve, 2500));
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

      // 5. Download result, composite clean product back on top, upscale, stamp EXIF
      logger.info("Storing generated image with EXIF metadata");
      const outputUrl = prediction.output?.[0];
      if (typeof outputUrl !== "string") throw new Error("Replicate returned no output URL");
      const generatedRes = await fetch(outputUrl);
      if (!generatedRes.ok) throw new Error(`Failed to download Replicate output: ${generatedRes.status}`);
      const generatedBuffer = Buffer.from(await generatedRes.arrayBuffer());

      // Composite the original clean Photoroom cutout back over FLUX's output.
      // FLUX may have slightly touched product-edge pixels despite the mask — this
      // overwrites those pixels with the exact product from Photoroom, guaranteeing
      // pixel-perfect edges. Then upscale to OUTPUT_SIZE (1200px) for Bol.com compliance.
      const composited = await sharp(generatedBuffer)
        .composite([{ input: productFit, left: pLeft, top: pTop, blend: "over" }])
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "fill" })
        .toBuffer();

      const withExif = await sharp(composited)
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: "AI-generated product photo by Fotograph",
              Software: "Fotograph — FLUX Fill Dev via Replicate",
              Artist: "Fotograph AI",
            },
          },
        })
        .jpeg({ quality: 92 })
        .toBuffer();

      const previewKey = `previews/${imageId}/${randomUUID()}.jpg`;

      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: previewKey,
        Body: withExif,
        ContentType: "image/jpeg",
      }));

      // 6. Mark done, deduct one credit
      const { userId } = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
        select: { userId: true },
      });

      await prisma.$transaction([
        prisma.image.update({
          where: { id: imageId },
          data: { status: "DONE", previewR2Keys: [previewKey] },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { creditsLeft: { decrement: 1 } },
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
