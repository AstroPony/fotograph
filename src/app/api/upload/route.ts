import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUploadUrl } from "@/lib/r2";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { randomUUID } from "crypto";

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { contentType?: string; filename?: string; fileSize?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { contentType, filename, fileSize } = body;

  if (!contentType || !filename || typeof fileSize !== "number") {
    return NextResponse.json({ error: "contentType, filename en fileSize zijn verplicht" }, { status: 400 });
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
    return NextResponse.json({ error: "Bestandstype niet toegestaan (gebruik JPG, PNG of WEBP)" }, { status: 415 });
  }

  if (fileSize > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Bestand is te groot — maximaal ${MAX_UPLOAD_BYTES / 1024 / 1024}MB toegestaan` },
      { status: 413 }
    );
  }

  // Upsert user record
  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: {},
    create: {
      supabaseId: user.id,
      email: user.email!,
    },
  });

  if (dbUser.creditsLeft <= 0) {
    return NextResponse.json({ error: "No credits remaining" }, { status: 402 });
  }

  const key = `uploads/${user.id}/${randomUUID()}-${filename}`;
  const uploadUrl = await getUploadUrl(key, contentType, fileSize);

  // Create image record in DB
  const image = await prisma.image.create({
    data: {
      userId: dbUser.id,
      rawR2Key: key,
      status: "PENDING",
    },
  });

  return NextResponse.json({ uploadUrl, key, imageId: image.id });
}
