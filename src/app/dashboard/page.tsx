import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";
import { SCENE_LABELS, IMAGE_STATUS_LABELS } from "@/lib/scenes";
import { DashboardPoller } from "@/components/dashboard-poller";
import { DashboardGallery } from "@/components/dashboard-gallery";

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

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardPoller hasProcessing={processing.length > 0} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Page header */}
        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Archief</p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Jouw foto&apos;s
          </h1>
        </div>

        {/* Processing queue */}
        {processing.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
              Bezig — {processing.length}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black">
              {processing.map((img) => (
                <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                  <div className="aspect-square bg-black/5 flex items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-black/40 animate-pulse">
                      {IMAGE_STATUS_LABELS[img.status] ?? img.status}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-black/50">
                    {SCENE_LABELS[img.sceneTheme ?? ""] ?? img.sceneTheme}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Failed jobs — collapsed by default */}
        {failed.length > 0 && (
          <details className="mb-10 group">
            <summary className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4 cursor-pointer list-none flex items-center justify-between select-none hover:text-black/60 transition-colors">
              <span>Mislukt — {failed.length}</span>
              <span className="text-black/40 group-open:rotate-180 transition-transform duration-200">▾</span>
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black">
              {failed.map((img) => (
                <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                  <div className="aspect-square bg-black/5 border border-black/10 flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <span className="text-xs uppercase tracking-widest text-black/30">Mislukt</span>
                    <Link
                      href="/upload"
                      className="border border-black px-3 py-1 text-[10px] uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
                    >
                      Opnieuw
                    </Link>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-black/30">
                    {SCENE_LABELS[img.sceneTheme ?? ""] ?? img.sceneTheme ?? "—"}
                  </p>
                  <p className="text-[10px] text-black/30">
                    {new Date(img.createdAt).toLocaleDateString("nl-NL", {
                      day: "numeric", month: "short",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Completed gallery */}
        {done.length > 0 ? (
          <section>
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
              Gereed — {done.length}
            </h2>
            <DashboardGallery images={done} />
          </section>
        ) : processing.length === 0 && failed.length === 0 ? (
          /* Empty state */
          <div className="border border-black p-12 flex flex-col items-center text-center gap-6">
            <div className="border-b-2 border-black pb-4 w-full">
              <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-2">
                Vol. 1 — Nr. 1
              </p>
              <h2 className="font-serif font-black text-4xl uppercase leading-none">
                Geen foto&apos;s
              </h2>
            </div>
            <p className="text-sm text-black/60 max-w-sm leading-relaxed">
              Je hebt nog geen productfoto&apos;s gegenereerd. Upload een foto om te beginnen.
            </p>
            <Link
              href="/upload"
              className="border border-black px-6 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
            >
              Eerste foto maken
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
