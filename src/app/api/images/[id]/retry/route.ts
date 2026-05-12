import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const image = await prisma.image.findFirst({
    where: { id, user: { supabaseId: user.id } },
  });

  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (image.status === "DONE") {
    return NextResponse.json({ error: "Already completed" }, { status: 400 });
  }

  await prisma.image.update({
    where: { id },
    data: { status: "PENDING", bgRemovedR2Key: null, previewR2Keys: [] },
  });

  try {
    await tasks.trigger("image-pipeline", {
      imageId: id,
      rawR2Key: image.rawR2Key,
      sceneTheme: image.sceneTheme ?? "white-seamless",
      customPrompt: image.customPrompt ?? "",
    });
  } catch (err) {
    await prisma.image.update({ where: { id }, data: { status: "FAILED" } });
    console.error("Retry dispatch failed", err);
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "PENDING" });
}
