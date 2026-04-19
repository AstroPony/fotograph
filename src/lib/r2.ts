import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export { MAX_UPLOAD_BYTES } from "./constants";

/** Presigned URL for direct browser upload (PUT). ContentLength is signed so R2 rejects mismatches. */
export async function getUploadUrl(key: string, contentType: string, contentLength: number) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min
}

/** Presigned URL for authenticated download (GET) */
export async function getDownloadUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 hour
}

/** Public URL for watermarked free-tier images served via R2 public bucket */
export function getPublicUrl(key: string) {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}
