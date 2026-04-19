import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDownloadUrl } from "@/lib/r2";
import { SCENE_LABELS, IMAGE_STATUS_LABELS } from "@/lib/scenes";
import { DashboardPoller } from "@/components/dashboard-poller";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
  const processing = imagesWithUrls.filter((i) => i.status !== "DONE" && i.status !== "FAILED");

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

        {/* Completed gallery */}
        {done.length > 0 ? (
          <section>
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
              Gereed — {done.length}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-black">
              {done.map((img) => (
                <div key={img.id} className="bg-white group relative overflow-hidden">
                  {img.previewUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.previewUrls[0]}
                      alt={`${SCENE_LABELS[img.sceneTheme ?? ""] ?? "Foto"} — ${img.id.slice(-6)}`}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-black/5" />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-3">
                    <p className="text-white font-serif font-black text-lg uppercase leading-tight">
                      {SCENE_LABELS[img.sceneTheme ?? ""] ?? img.sceneTheme}
                    </p>
                    <p className="text-white/50 text-xs uppercase tracking-widest">
                      {new Date(img.createdAt).toLocaleDateString("nl-NL", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                    {img.previewUrls[0] && (
                      <a
                        href={img.previewUrls[0]}
                        download
                        className="border border-white text-white text-xs uppercase tracking-widest px-3 py-1.5 hover:bg-white hover:text-black transition-colors text-center"
                      >
                        Downloaden
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
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
        )}
      </main>
    </div>
  );
}
