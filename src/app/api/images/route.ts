import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const images = await prisma.image.findMany({
    where: { user: { supabaseId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      sceneTheme: true,
      previewR2Keys: true,
      createdAt: true,
    },
  });

  const withUrls = await Promise.all(
    images.map(async (img) => {
      const settled = await Promise.allSettled(
        img.previewR2Keys.map((key) => getDownloadUrl(key))
      );
      const previewUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      return { ...img, previewUrls };
    })
  );

  return NextResponse.json(withUrls);
}
