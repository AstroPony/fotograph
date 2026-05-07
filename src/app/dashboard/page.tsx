import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";
import { DashboardPoller } from "@/components/dashboard-poller";
import { DashboardContent } from "@/components/dashboard-content";

const STUCK_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Auto-expire stuck jobs older than 2 hours
  const stuckCutoff = new Date(Date.now() - STUCK_AFTER_MS);
  await prisma.image.updateMany({
    where: {
      user: { supabaseId: user.id },
      status: { in: ["PENDING", "REMOVING_BG", "GENERATING", "UPSCALING"] },
      createdAt: { lt: stuckCutoff },
    },
    data: { status: "FAILED" },
  });

  const images = await prisma.image.findMany({
    where: { user: { supabaseId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, status: true, sceneTheme: true, previewR2Keys: true, createdAt: true },
  });

  const imagesWithUrls = await Promise.all(
    images.map(async (img) => {
      const settled = await Promise.allSettled(
        img.previewR2Keys.map((k) => getDownloadUrl(k))
      );
      const previewUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
        .map((r) => r.value);
      return { ...img, previewUrls };
    })
  );

  const done = imagesWithUrls.filter((i) => i.status === "DONE");
  const processing = imagesWithUrls.filter(
    (i) => i.status !== "DONE" && i.status !== "FAILED"
  );
  const failed = imagesWithUrls.filter((i) => i.status === "FAILED");

  const serialize = (imgs: typeof imagesWithUrls) =>
    imgs.map((img) => ({ ...img, createdAt: img.createdAt.toISOString() }));

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardPoller hasProcessing={processing.length > 0} />
      <DashboardContent
        done={serialize(done)}
        processing={serialize(processing)}
        failed={serialize(failed)}
      />
    </div>
  );
}
