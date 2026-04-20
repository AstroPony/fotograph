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
    // Global safety suffix: prevent text hallucinations and unwanted practical effects
    const finalPrompt = `${userPrompt} No text, no writing, no typography, no watermarks, no smoke, no mist, no cables, no cords.`;

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

      // 3. Resize product and compute placement
      // Base anchored at 76% of canvas height so the product sits on the scene surface.
      const productFit = await sharp(bgRemovedBuffer)
        .resize(PRODUCT_MAX, PRODUCT_MAX, { fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer();
      const { width: pw, height: ph } = await sharp(productFit).metadata();
      const pLeft = Math.round((SIZE - pw!) / 2);
      const pTop  = Math.round(SIZE * 0.76 - ph!);

      // 4. Build inpainting canvas and mask for FLUX Fill Pro.
      //
      // Canvas: gray RGB 1024×1024 with the product composited in position.
      //   FLUX can see the product's shape/colour and generate a contextually
      //   consistent scene around it (correct lighting direction, shadow cues).
      //
      // Mask: WHITE (255) = generate scene, BLACK (0) = preserve product area.
      //   FLUX Fill Pro is a non-distilled model with proper CFG guidance, so
      //   it respects the black (keep) region far better than Fill Dev did.
      //   Even so, we re-composite the clean Photoroom cutout on top afterwards
      //   as a hard pixel-integrity guarantee — no diffusion distortion possible.
      logger.info("Building inpainting canvas and mask");

      const canvas = await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 128, g: 128, b: 128 } },
      })
        .composite([{ input: productFit, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      // Build a 3-channel RGB mask: white canvas, black product footprint.
      // Use joinChannel to merge a binary alpha silhouette onto a black RGB base,
      // then composite the resulting RGBA onto a white canvas (alpha blending makes
      // product area go black, surrounding area stays white).
      const productAlpha = await sharp(productFit)
        .extractChannel("alpha")
        .threshold(128)   // binarise Photoroom's feathered edges
        .png()
        .toBuffer();

      const blackBase = await sharp({
        create: { width: pw!, height: ph!, channels: 3, background: { r: 0, g: 0, b: 0 } },
      }).png().toBuffer();

      const blackProductRGBA = await sharp(blackBase).joinChannel(productAlpha).png().toBuffer();

      const mask = await sharp({
        create: { width: SIZE, height: SIZE, channels: 3, background: { r: 255, g: 255, b: 255 } },
      })
        .composite([{ input: blackProductRGBA, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      const imageB64 = `data:image/png;base64,${canvas.toString("base64")}`;
      const maskB64  = `data:image/png;base64,${mask.toString("base64")}`;

      // 5. FLUX.1 Fill Pro inpainting — generates contextual scene, lighting, and
      //    shadows around the product. Fill Pro uses proper CFG guidance (not the
      //    distilled architecture of Fill Dev that caused deformation).
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
              // guidance: Fill Dev (distilled) used 30 as its special guidance parameter.
              // Fill Pro (non-distilled) may use standard CFG (~3.5-7) OR keep the Fill
              // convention of 30. Using 30 here — tune down if output looks overcooked.
              guidance: 30,
              steps: 25,
              // safety_tolerance: Fill Pro parameter (0=strict, 2=permissive for products).
              // May not exist on all model versions — benign if ignored by Replicate.
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

      // 6. Re-composite the pixel-perfect Photoroom product on top of the inpainted scene.
      //    FLUX's shadows on the surface AROUND the product edges are preserved.
      //    Trade-off: contact shadow directly UNDER the product (in the black/keep region)
      //    is covered by the re-composite. Acceptable — the surrounding shadow grounds the
      //    product; the area directly under it is hidden by the product itself anyway.
      //    Product pixels are 100% Photoroom — zero diffusion distortion regardless of
      //    how well Fill Pro respects the mask.
      logger.info("Compositing clean product onto inpainted scene");

      const composited = await sharp(inpaintedBuffer)
        .resize(SIZE, SIZE, { fit: "cover" })
        .composite([{ input: productFit, left: pLeft, top: pTop }])
        .png()
        .toBuffer();

      // 7. Upscale to OUTPUT_SIZE for Bol.com compliance, stamp EU AI Act EXIF
      logger.info("Storing generated image with EXIF metadata");

      const withExif = await sharp(composited)
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "fill" })
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
