"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { DashboardGallery } from "@/components/dashboard-gallery";
import { SCENE_THEMES } from "@/lib/scenes";
import type { TranslationKey } from "@/lib/translations";

type DashImage = {
  id: string;
  status: string;
  sceneTheme: string | null;
  batchId: string | null;
  previewUrls: string[];
  createdAt: string;
};

type Props = {
  done: DashImage[];
  processing: DashImage[];
  failed: DashImage[];
};

const STUCK_MS = 30 * 60 * 1000; // 30 minutes

export function DashboardContent({ done, processing, failed }: Props) {
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [sceneFilter, setSceneFilter] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);

  const sceneLabel = (id: string | null) =>
    id ? t(`scene_${id}` as TranslationKey) || id : "—";

  const statusLabel = (status: string) =>
    t(`img_status_${status}` as TranslationKey) || status;

  const dateLocale = lang === "nl" ? "nl-NL" : "en-GB";

  const sceneOptions = useMemo(() => {
    const ids = new Set(done.map((i) => i.sceneTheme).filter(Boolean) as string[]);
    return SCENE_THEMES.filter((s) => ids.has(s.id));
  }, [done]);

  const filteredDone = useMemo(() => {
    const list = sceneFilter ? done.filter((i) => i.sceneTheme === sceneFilter) : done;
    return sortOrder === "oldest" ? [...list].reverse() : list;
  }, [done, sceneFilter, sortOrder]);

  const galleryImages = useMemo(
    () => filteredDone.map((img) => ({ ...img, createdAt: new Date(img.createdAt) })),
    [filteredDone]
  );

  const handleRetry = useCallback(async (imageId: string) => {
    setRetrying((s) => new Set(s).add(imageId));
    try {
      const res = await fetch(`/api/images/${imageId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      // ignore — image stays failed, user can try again
    } finally {
      setRetrying((s) => { const next = new Set(s); next.delete(imageId); return next; });
    }
  }, [router]);

  const handleDownloadZip = useCallback(async (imageIds: string[]) => {
    if (!imageIds.length || zipping) return;
    setZipping(true);
    try {
      const res = await fetch("/api/download/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotograph-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent fail — user can try again
    } finally {
      setZipping(false);
    }
  }, [zipping]);

  const now = Date.now();

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="border-b-4 border-black pb-4 mb-10">
        <p className="text-xs uppercase tracking-widest font-medium mb-1">{t("dashboard_archive")}</p>
        <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
          {t("dashboard_your_photos")}
        </h1>
      </div>

      {processing.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
            {t("dashboard_processing")} — {processing.length}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black">
            {processing.map((img) => {
              const isStuck = now - new Date(img.createdAt).getTime() > STUCK_MS;
              const isRetrying = retrying.has(img.id);
              return (
                <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                  <div className="aspect-square bg-black/5 flex flex-col items-center justify-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-black/40 animate-pulse">
                      {statusLabel(img.status)}
                    </span>
                    {isStuck && (
                      <button
                        onClick={() => handleRetry(img.id)}
                        disabled={isRetrying}
                        className="border border-black/30 px-2 py-0.5 text-[10px] uppercase tracking-widest hover:border-black hover:text-black transition-colors text-black/40 disabled:opacity-40"
                      >
                        {isRetrying ? "…" : t("dashboard_retry")}
                      </button>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-widest text-black/50">
                    {sceneLabel(img.sceneTheme)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {failed.length > 0 && (
        <details className="mb-10 group">
          <summary className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4 cursor-pointer list-none flex items-center justify-between select-none hover:text-black/60 transition-colors">
            <span>{t("dashboard_failed_section")} — {failed.length}</span>
            <span className="text-black/40 group-open:rotate-180 transition-transform duration-200">▾</span>
          </summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black">
            {failed.map((img) => {
              const isRetrying = retrying.has(img.id);
              return (
                <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                  <div className="aspect-square bg-black/5 border border-black/10 flex flex-col items-center justify-center gap-3 p-4 text-center">
                    <span className="text-xs uppercase tracking-widest text-black/30">{t("dashboard_failed_label")}</span>
                    <button
                      onClick={() => handleRetry(img.id)}
                      disabled={isRetrying}
                      className="border border-black px-3 py-1 text-[10px] uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                    >
                      {isRetrying ? "…" : t("dashboard_retry")}
                    </button>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-black/30">
                    {sceneLabel(img.sceneTheme)}
                  </p>
                  <p className="text-[10px] text-black/30">
                    {new Date(img.createdAt).toLocaleDateString(dateLocale, {
                      day: "numeric", month: "short",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {done.length > 0 ? (
        <section>
          {/* Section header with sort/filter/ZIP controls */}
          <div className="border-b border-black pb-2 mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-xs uppercase tracking-widest font-medium shrink-0">
              {t("dashboard_ready")} — {filteredDone.length}{sceneFilter && done.length !== filteredDone.length ? `/${done.length}` : ""}
            </h2>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Sort toggle */}
              <button
                onClick={() => setSortOrder((o) => o === "newest" ? "oldest" : "newest")}
                className="text-[10px] uppercase tracking-widest border border-black/30 px-2 py-1 hover:border-black transition-colors"
              >
                {sortOrder === "newest" ? t("dashboard_sort_newest") : t("dashboard_sort_oldest")} ↕
              </button>

              {/* Scene filter chips */}
              {sceneOptions.length > 1 && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setSceneFilter(null)}
                    className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors ${
                      sceneFilter === null ? "border-black bg-black text-white" : "border-black/30 hover:border-black"
                    }`}
                  >
                    {t("dashboard_filter_all")}
                  </button>
                  {sceneOptions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSceneFilter(sceneFilter === s.id ? null : s.id)}
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 border transition-colors hidden sm:block ${
                        sceneFilter === s.id ? "border-black bg-black text-white" : "border-black/30 hover:border-black"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ZIP download */}
              <button
                onClick={() => handleDownloadZip(filteredDone.map((i) => i.id))}
                disabled={zipping || filteredDone.length === 0}
                className="text-[10px] uppercase tracking-widest border border-black px-3 py-1 hover:bg-black hover:text-white transition-colors disabled:opacity-40"
              >
                {zipping ? "…" : t("dashboard_download_zip")}
              </button>
            </div>
          </div>

          <DashboardGallery images={galleryImages} />
        </section>
      ) : processing.length === 0 && failed.length === 0 ? (
        <div className="border border-black p-12 flex flex-col items-center text-center gap-6">
          <div className="border-b-2 border-black pb-4 w-full">
            <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-2">
              {t("dashboard_vol")}
            </p>
            <h2 className="font-serif font-black text-4xl uppercase leading-none">
              {t("dashboard_no_photos")}
            </h2>
          </div>
          <p className="text-sm text-black/60 max-w-sm leading-relaxed">
            {t("dashboard_no_photos_body")}
          </p>
          <Link
            href="/upload"
            className="border border-black px-6 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
          >
            {t("dashboard_first_photo")}
          </Link>
        </div>
      ) : null}
    </main>
  );
}
