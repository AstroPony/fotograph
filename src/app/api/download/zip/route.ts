import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";
import { zipSync } from "fflate";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { imageIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { imageIds } = body;
  if (!imageIds?.length) return NextResponse.json({ error: "imageIds required" }, { status: 400 });
  if (imageIds.length > 100) return NextResponse.json({ error: "Max 100 images" }, { status: 400 });

  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, user: { supabaseId: user.id }, status: "DONE" },
    select: { id: true, previewR2Keys: true, sceneTheme: true },
  });

  const files: Record<string, Uint8Array> = {};

  await Promise.all(
    images.flatMap((img) =>
      img.previewR2Keys.map(async (key, i) => {
        try {
          const url = await getDownloadUrl(key);
          const res = await fetch(url);
          if (!res.ok) return;
          const buffer = await res.arrayBuffer();
          const scene = (img.sceneTheme ?? "foto").replace(/[^a-z0-9-]/gi, "");
          const suffix = img.previewR2Keys.length > 1 ? `-${i + 1}` : "";
          files[`${scene}-${img.id.slice(-6)}${suffix}.jpg`] = new Uint8Array(buffer);
        } catch {
          // skip unreachable images
        }
      })
    )
  );

  if (!Object.keys(files).length) {
    return NextResponse.json({ error: "No images available" }, { status: 404 });
  }

  const zip = zipSync(files);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fotograph-${date}.zip"`,
    },
  });
}
