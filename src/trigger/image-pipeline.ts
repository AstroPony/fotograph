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
const SIZE = 1024;          // working resolution
const OUTPUT_SIZE = 1200;   // Bol.com minimum (1200×1200px for zoom)
const PRODUCT_MAX = Math.round(SIZE * 0.58); // ~594px — leaves generous scene room

// Shadow parameters — light convention: upper-left, so shadow falls lower-right.
// Two layers mimic real photography: a tight dark contact shadow + a wide soft diffuse shadow.
// Together they ground the product without looking synthetic.
const SHADOW = {
  contact: { blur: 8,  offsetX: 6,  offsetY: 10, opacity: 0.55 },
  diffuse: { blur: 24, offsetX: 14, offsetY: 20, opacity: 0.30 },
};

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
    // Composition suffix: tells FLUX to keep the surface in the lower half of the frame,
    // which is where we composite the product. "Three-quarter overhead angle" was removed —
    // it caused FLUX to render extreme ground-level shots that floated the product.
    const withComposition = sceneBase
      ? `${sceneBase} The flat surface fills the lower half of the frame, background recedes behind.`
      : "";
    const finalPrompt = customPrompt
      ? `${withComposition} ${customPrompt}`.trim()
      : withComposition;

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

      // 3. Generate background scene with FLUX Schnell (text-to-image).
      // The product is never fed into FLUX — only the scene prompt is. This guarantees
      // zero diffusion distortion on the product. Shadow is added via Sharp in step 5.
      logger.info("Generating background scene with FLUX Schnell");

      const startRes = await fetch(
        "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              prompt: finalPrompt,
              width: SIZE,
              height: SIZE,
              num_outputs: 1,
              num_inference_steps: 4,
              output_format: "webp",
              output_quality: 95,
            },
          }),
        }
      );
      if (!startRes.ok) {
        throw new Error(`Replicate start error: ${await startRes.text()}`);
      }

      let prediction = await startRes.json();

      const maxPolls = 60;
      let polls = 0;
      while (prediction.status !== "succeeded" && prediction.status !== "failed") {
        if (polls++ >= maxPolls) throw new Error("Replicate prediction timed out after 2 minutes");
        await new Promise((resolve) => setTimeout(resolve, 2000));
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

      const outputUrl = prediction.output?.[0];
      if (typeof outputUrl !== "string") throw new Error("Replicate returned no output URL");
      const generatedRes = await fetch(outputUrl);
      if (!generatedRes.ok) throw new Error(`Failed to download Replicate output: ${generatedRes.status}`);
      const backgroundBuffer = Buffer.from(await generatedRes.arrayBuffer());

      // 4. Resize product, preserve Photoroom's soft alpha (feathered edges → natural shadow penumbra)
      logger.info("Compositing product with synthesized shadow");

      const productFit = await sharp(bgRemovedBuffer)
        .resize(PRODUCT_MAX, PRODUCT_MAX, { fit: "inside" })
        .ensureAlpha()
        .png()
        .toBuffer();
      const { width: pw, height: ph } = await sharp(productFit).metadata();
      const pLeft = Math.round((SIZE - pw!) / 2);
      // Anchor product base at 76% of canvas height (not centered) so it sits on the surface
      // zone that FLUX generates in the lower half of the frame.
      const pTop  = Math.round(SIZE * 0.76 - ph!);

      // 5. Shadow synthesis using the product's alpha channel.
      // Photoroom's soft feathered edges serve as the natural penumbra — no threshold applied.
      // Two layers (contact + diffuse) reproduce the appearance of a real studio shadow.
      const alphaChannel = await sharp(productFit).extractChannel("alpha").png().toBuffer();

      const contactAlpha = await sharp(alphaChannel).blur(SHADOW.contact.blur).linear(SHADOW.contact.opacity, 0).png().toBuffer();
      const diffuseAlpha = await sharp(alphaChannel).blur(SHADOW.diffuse.blur).linear(SHADOW.diffuse.opacity, 0).png().toBuffer();

      // Black RGB base joined with each alpha layer → RGBA shadow sprites
      const shadowBase = await sharp({
        create: { width: pw!, height: ph!, channels: 3, background: { r: 0, g: 0, b: 0 } },
      }).png().toBuffer();

      const contactShadow = await sharp(shadowBase).joinChannel(contactAlpha).png().toBuffer();
      const diffuseShadow = await sharp(shadowBase).joinChannel(diffuseAlpha).png().toBuffer();

      // 6. Final composite: background → diffuse shadow → contact shadow → product
      // Layer order matters: diffuse is furthest from product, contact is closest.
      // fit: "cover" — centered crop, never distorts. FLUX returns SIZE×SIZE so this is a no-op in
      // practice, but cover is the correct defensive choice for any background image.
      // Shadow direction: upper-left light (matches all scene prompts). Wrong for moody-industrial
      // (rim from upper-right) and sleek-tech (no overhead) — acceptable trade-off for MVP.
      const composited = await sharp(backgroundBuffer)
        .resize(SIZE, SIZE, { fit: "cover" })
        .composite([
          { input: diffuseShadow, left: pLeft + SHADOW.diffuse.offsetX, top: pTop + SHADOW.diffuse.offsetY },
          { input: contactShadow, left: pLeft + SHADOW.contact.offsetX, top: pTop + SHADOW.contact.offsetY },
          { input: productFit,    left: pLeft,                          top: pTop                           },
        ])
        .png()
        .toBuffer();

      // 7. Upscale to OUTPUT_SIZE for Bol.com compliance, stamp EXIF
      logger.info("Storing generated image with EXIF metadata");

      const withExif = await sharp(composited)
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "fill" })
        .withMetadata({
          exif: {
            IFD0: {
              ImageDescription: "AI-generated product photo by Fotograph",
              Software: "Fotograph — FLUX Schnell via Replicate",
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
