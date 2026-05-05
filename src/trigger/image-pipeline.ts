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
const SIZE = 1024;
const OUTPUT_SIZE = 1200;   // Bol.com minimum
const PRODUCT_MAX = Math.round(SIZE * 0.58); // ~594px — generous scene room

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

    const sceneBase = SCENE_PROMPTS[sceneTheme] ?? "";
    const userPrompt = customPrompt ? `${sceneBase} ${customPrompt}`.trim() : sceneBase;
    // Global safety suffix: prevent text, people, and props that would conflict with product compositing
    const finalPrompt = `${userPrompt} No text, no writing, no typography, no watermarks, no smoke, no mist, no cables, no cords, no people, no models, no mannequins, no glowing objects, no pedestals, no platforms, no raised bases, no props in the foreground.`;

    if (!BUCKET) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set");
    if (!process.env.PHOTOROOM_API_KEY) throw new Error("PHOTOROOM_API_KEY is not set");
    if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not set");

    const TIER_OUTPUT_SIZE: Record<string, number> = {
      FREE: 512,
      STARTER: 1024,
      PRO: OUTPUT_SIZE,
      BUSINESS: OUTPUT_SIZE,
    };

    try {
      // 0. Fetch user tier upfront — needed for output sizing and watermark
      const { userId, user } = await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
        select: { userId: true, user: { select: { tier: true } } },
      });
      const userTier = user.tier as string;
      const outSize = TIER_OUTPUT_SIZE[userTier] ?? OUTPUT_SIZE;

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

      // 3. Resize product and compute placement.
      // Product bottom anchored at 76% canvas height so it sits on the scene surface.
      const productFit = await sharp(bgRemovedBuffer)
        .resize(PRODUCT_MAX, PRODUCT_MAX, { fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer();
      const { width: pw, height: ph } = await sharp(productFit).metadata();
      const pLeft = Math.round((SIZE - pw!) / 2);
      const pTop  = Math.round(SIZE * 0.76 - ph!);

      // 4. Build blank canvas and all-white mask for FLUX Fill Pro.
      //
      // Canvas: uniform gray 1024×1024 — no product. FLUX generates the complete
      //   scene from scratch guided entirely by the text prompt.
      //
      // Mask: all-white — FLUX regenerates every pixel. The product is composited
      //   onto the finished scene in step 6, so there is nothing to preserve here.
      //   Scene prompts explicitly describe an empty center foreground, preventing
      //   FLUX from filling that space with unexpected objects or people.
      logger.info("Building blank canvas and full-generation mask");

      const canvas = await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 128, g: 128, b: 128 } },
      }).png().toBuffer();

      const mask = await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } },
      }).png().toBuffer();

      const imageB64 = `data:image/png;base64,${canvas.toString("base64")}`;
      const maskB64  = `data:image/png;base64,${mask.toString("base64")}`;

      // 5. FLUX.1 Fill Pro inpainting — generates the complete scene background.
      logger.info("Generating scene with FLUX Fill Pro inpainting");

      const startRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions",
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
              steps: 25,
              safety_tolerance: 2,
              output_format: "png",
            },
          }),
        }
      );
      if (!startRes.ok) {
        throw new Error(`Replicate start error: ${await startRes.text()}`);
      }

      let prediction = await startRes.json();

      // Poll until done — Fill Pro runs ~25-45s at 25 steps
      const maxPolls = 90;
      let polls = 0;
      while (prediction.status !== "succeeded" && prediction.status !== "failed") {
        if (polls++ >= maxPolls) throw new Error("Replicate prediction timed out after ~3.5 minutes");
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

      const rawOutput = prediction.output;
      const outputUrl = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
      if (typeof outputUrl !== "string") throw new Error("Replicate returned no output URL");
      const generatedRes = await fetch(outputUrl);
      if (!generatedRes.ok) throw new Error(`Failed to download Replicate output: ${generatedRes.status}`);
      const inpaintedBuffer = Buffer.from(await generatedRes.arrayBuffer());

      // 6. Add AI contact shadow to the clean cutout via Photoroom Shadow API,
      //    then composite onto the FLUX scene.
      //    Shadow is requested on the transparent cutout so it alpha-blends naturally
      //    onto the FLUX-generated surface. Gracefully falls back to no shadow on error.
      logger.info("Adding contact shadow via Photoroom");

      let productToComposite = productFit;
      const shadowFormData = new FormData();
      shadowFormData.append("imageFile", new Blob([new Uint8Array(productFit)], { type: "image/png" }), "product.png");
      shadowFormData.append("shadow.mode", "ai.soft");

      const shadowRes = await fetch("https://image-api.photoroom.com/v2/edit", {
        method: "POST",
        headers: { "x-api-key": process.env.PHOTOROOM_API_KEY! },
        body: shadowFormData,
      });

      if (shadowRes.ok) {
        productToComposite = Buffer.from(await shadowRes.arrayBuffer());
        logger.info("Shadow applied");
      } else {
        logger.warn("Photoroom shadow skipped", { status: shadowRes.status, body: await shadowRes.text() });
      }

      // Composite the clean product cutout onto the FLUX-generated scene.
      // No blanking step needed — FLUX never saw the product, so there is no
      // shifted copy to remove.
      logger.info("Compositing product onto inpainted scene");

      const composited = await sharp(inpaintedBuffer)
        .resize(SIZE, SIZE, { fit: "cover" })
        .composite([{ input: productToComposite, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      // 7. Tier-aware output sizing + free-tier watermark + EU AI Act EXIF
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
              Software: "Fotograph — FLUX.1 Fill Pro via Replicate",
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

      // 8. Mark done, deduct one credit
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
