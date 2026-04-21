import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import { getDownloadUrl } from "@/lib/r2";
import { SCENE_THEMES } from "@/lib/scenes";

const VALID_SCENE_IDS = new Set(SCENE_THEMES.map((t) => t.id));
const MAX_CUSTOM_PROMPT_LENGTH = 300;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { imageId?: string; sceneTheme?: string; customPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { imageId, sceneTheme, customPrompt } = body;

  if (!imageId) {
    return NextResponse.json({ error: "imageId required" }, { status: 400 });
  }

  if (sceneTheme && !VALID_SCENE_IDS.has(sceneTheme)) {
    return NextResponse.json({ error: "Ongeldige scène" }, { status: 400 });
  }

  if (customPrompt && customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
    return NextResponse.json({ error: `Aangepaste prompt mag maximaal ${MAX_CUSTOM_PROMPT_LENGTH} tekens zijn` }, { status: 400 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { creditsLeft: true },
  });

  if (!isAdmin && (!dbUser || dbUser.creditsLeft < 1)) {
    return NextResponse.json({ error: "Geen credits meer. Koop een creditpakket om door te gaan." }, { status: 402 });
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

  try {
    await tasks.trigger("image-pipeline", {
      imageId,
      rawR2Key: image.rawR2Key,
      sceneTheme: sceneTheme ?? "minimalist-studio",
      customPrompt: customPrompt ?? "product on a minimalist white studio background, soft box lighting, professional e-commerce photography",
    });
  } catch (err) {
    await prisma.image.update({ where: { id: imageId }, data: { status: "FAILED" } });
    console.error("Failed to dispatch pipeline task", err);
    return NextResponse.json({ error: "Verwerking starten mislukt" }, { status: 500 });
  }

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
  const settled = await Promise.allSettled(
    image.previewR2Keys.map((key) => getDownloadUrl(key))
  );
  const previewUrls = settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);

  return NextResponse.json({ ...image, previewUrls });
}
