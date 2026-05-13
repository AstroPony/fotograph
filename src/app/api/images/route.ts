import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
  const take = Math.min(parseInt(request.nextUrl.searchParams.get("take") ?? "100"), 200);

  const images = await prisma.image.findMany({
    where: { user: { supabaseId: user.id }, status: "DONE" },
    orderBy: { createdAt: "desc" },
    take: take + 1, // fetch one extra to determine hasMore
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      status: true,
      sceneTheme: true,
      batchId: true,
      previewR2Keys: true,
      createdAt: true,
    },
  });

  const hasMore = images.length > take;
  const page = images.slice(0, take);

  const withUrls = await Promise.all(
    page.map(async (img) => {
      const settled = await Promise.allSettled(
        img.previewR2Keys.map((key) => getDownloadUrl(key))
      );
      const previewUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      return { ...img, previewUrls, createdAt: img.createdAt.toISOString() };
    })
  );

  return NextResponse.json({ images: withUrls, hasMore });
}
