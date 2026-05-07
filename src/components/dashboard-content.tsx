"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { DashboardGallery } from "@/components/dashboard-gallery";
import type { TranslationKey } from "@/lib/translations";

type DashImage = {
  id: string;
  status: string;
  sceneTheme: string | null;
  previewUrls: string[];
  createdAt: string;
};

type Props = {
  done: DashImage[];
  processing: DashImage[];
  failed: DashImage[];
};

export function DashboardContent({ done, processing, failed }: Props) {
  const { t, lang } = useLanguage();

  const sceneLabel = (id: string | null) =>
    id ? t(`scene_${id}` as TranslationKey) || id : "—";

  const statusLabel = (status: string) =>
    t(`img_status_${status}` as TranslationKey) || status;

  const dateLocale = lang === "nl" ? "nl-NL" : "en-GB";

  const galleryImages = done.map((img) => ({
    ...img,
    createdAt: new Date(img.createdAt),
  }));

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
            {processing.map((img) => (
              <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                <div className="aspect-square bg-black/5 flex items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-black/40 animate-pulse">
                    {statusLabel(img.status)}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-widest text-black/50">
                  {sceneLabel(img.sceneTheme)}
                </p>
              </div>
            ))}
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
            {failed.map((img) => (
              <div key={img.id} className="bg-white p-4 flex flex-col gap-2">
                <div className="aspect-square bg-black/5 border border-black/10 flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <span className="text-xs uppercase tracking-widest text-black/30">{t("dashboard_failed_label")}</span>
                  <Link
                    href="/upload"
                    className="border border-black px-3 py-1 text-[10px] uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
                  >
                    {t("dashboard_retry")}
                  </Link>
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
            ))}
          </div>
        </details>
      )}

      {done.length > 0 ? (
        <section>
          <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
            {t("dashboard_ready")} — {done.length}
          </h2>
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
