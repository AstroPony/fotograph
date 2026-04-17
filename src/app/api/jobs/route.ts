import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import { getDownloadUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageId, sceneTheme, customPrompt } = await request.json();

  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: { id: imageId, user: { supabaseId: user.id } },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  await prisma.image.update({
    where: { id: imageId },
    data: { sceneTheme, customPrompt },
  });

  await tasks.trigger("image-pipeline", {
    imageId,
    rawR2Key: image.rawR2Key,
    sceneTheme: sceneTheme ?? "minimalist-studio",
    customPrompt: customPrompt ?? "product on a minimalist white studio background, soft box lighting, professional e-commerce photography",
  });

  return NextResponse.json({ imageId, status: "PENDING" });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const imageId = request.nextUrl.searchParams.get("imageId");
  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  const image = await prisma.image.findFirst({
    where: { id: imageId, user: { supabaseId: user.id } },
    select: { id: true, status: true, previewR2Keys: true, finalR2Key: true },
  });

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Convert R2 keys to presigned download URLs
  const previewUrls = await Promise.all(
    image.previewR2Keys.map((key) => getDownloadUrl(key))
  );

  return NextResponse.json({ ...image, previewUrls });
}
