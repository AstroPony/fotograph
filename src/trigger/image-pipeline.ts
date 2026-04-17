import { task, logger } from "@trigger.dev/sdk";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { randomUUID } from "crypto";

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME;

export const imagePipelineTask = task({
  id: "image-pipeline",
  maxDuration: 300,

  run: async (payload: {
    imageId: string;
    rawR2Key: string;
    sceneTheme: string;
    customPrompt: string;
  }) => {
    const { imageId, rawR2Key, customPrompt } = payload;

    if (!BUCKET) throw new Error("CLOUDFLARE_R2_BUCKET_NAME is not set");
    if (!process.env.PHOTOROOM_API_KEY) throw new Error("PHOTOROOM_API_KEY is not set");
    if (!process.env.REPLICATE_API_TOKEN) throw new Error("REPLICATE_API_TOKEN is not set");

    try {
      // 1. Download raw image from R2
      logger.info("Downloading raw image", { rawR2Key });
      const rawObj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: rawR2Key }));
      if (!rawObj.Body) throw new Error(`R2 object body missing for key: ${rawR2Key}`);
      const rawBuffer = Buffer.from(await rawObj.Body.transformToByteArray());

      // 2. Background removal via Photoroom
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

      // 3. Scene generation via Replicate FLUX Schnell (img2img — product + scene prompt)
      logger.info("Generating scene with FLUX Schnell");

      const bgRemovedBase64 = `data:image/png;base64,${bgRemovedBuffer.toString("base64")}`;

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
              prompt: customPrompt,
              image: bgRemovedBase64,
              prompt_strength: 0.85,
              num_outputs: 1,
              aspect_ratio: "1:1",
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

      // Poll until done (max 2 minutes)
      const maxPolls = 48;
      let polls = 0;
      while (prediction.status !== "succeeded" && prediction.status !== "failed") {
        if (polls++ >= maxPolls) throw new Error("Replicate prediction timed out after 2 minutes");
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

      // 4. Download output, stamp EXIF (EU AI Act compliance), upload to R2
      logger.info("Storing generated image with EXIF metadata");
      const outputUrl = prediction.output?.[0];
      if (typeof outputUrl !== "string") throw new Error("Replicate returned no output URL");
      const generatedRes = await fetch(outputUrl);
      if (!generatedRes.ok) throw new Error(`Failed to download Replicate output: ${generatedRes.status}`);
      const generatedBuffer = Buffer.from(await generatedRes.arrayBuffer());

      const withExif = await sharp(generatedBuffer)
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

      // 5. Mark done, deduct one credit
      const { userId } = (await prisma.image.findUniqueOrThrow({
        where: { id: imageId },
        select: { userId: true },
      }));

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
