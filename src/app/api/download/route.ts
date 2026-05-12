import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const imageId = request.nextUrl.searchParams.get("imageId");
  const idx = parseInt(request.nextUrl.searchParams.get("idx") ?? "0", 10);

  if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });

  const image = await prisma.image.findFirst({
    where: { id: imageId, user: { supabaseId: user.id } },
    select: { id: true, previewR2Keys: true, sceneTheme: true },
  });

  if (!image || !image.previewR2Keys[idx]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getDownloadUrl(image.previewR2Keys[idx]);
  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

  const scene = (image.sceneTheme ?? "foto").replace(/[^a-z0-9-]/gi, "");
  const filename = `fotograph-${scene}-${image.id.slice(-6)}.jpg`;

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
