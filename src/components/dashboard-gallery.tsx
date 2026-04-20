"use client";

import { useState, useEffect, useCallback } from "react";
import { SCENE_LABELS } from "@/lib/scenes";

type GalleryImage = {
  id: string;
  sceneTheme: string | null;
  createdAt: Date;
  previewUrls: string[];
};

export function DashboardGallery({ images }: { images: GalleryImage[] }) {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);

  const close = useCallback(() => setLightbox(null), []);

  const prev = useCallback(() => {
    if (!lightbox) return;
    const i = images.findIndex((x) => x.id === lightbox.id);
    if (i > 0) setLightbox(images[i - 1]);
  }, [lightbox, images]);

  const next = useCallback(() => {
    if (!lightbox) return;
    const i = images.findIndex((x) => x.id === lightbox.id);
    if (i < images.length - 1) setLightbox(images[i + 1]);
  }, [lightbox, images]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, close, prev, next]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  const currentIndex = lightbox ? images.findIndex((x) => x.id === lightbox.id) : -1;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-black">
        {images.map((img) => (
          <div key={img.id} className="bg-white group relative overflow-hidden">
            {img.previewUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.previewUrls[0]}
                alt={`${SCENE_LABELS[img.sceneTheme ?? ""] ?? "Foto"} — ${img.id.slice(-6)}`}
                className="w-full aspect-square object-cover cursor-zoom-in"
                onClick={() => setLightbox(img)}
              />
            ) : (
              <div className="w-full aspect-square bg-black/5" />
            )}

            {/* Hover overlay — stopPropagation on download buttons only, rest opens lightbox */}
            <div
              className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-3 cursor-zoom-in"
              onClick={() => setLightbox(img)}
            >
              <p className="text-white font-serif font-black text-lg uppercase leading-tight">
                {SCENE_LABELS[img.sceneTheme ?? ""] ?? img.sceneTheme}
              </p>
              <p className="text-white/50 text-xs uppercase tracking-widest">
                {new Date(img.createdAt).toLocaleDateString("nl-NL", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                {img.previewUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    download
                    className="border border-white text-white text-xs uppercase tracking-widest px-3 py-1.5 hover:bg-white hover:text-black transition-colors text-center"
                  >
                    {img.previewUrls.length > 1 ? `Downloaden ${i + 1}` : "Downloaden"}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox — no focus trap; Tab can escape the overlay (acceptable for MVP) */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={SCENE_LABELS[lightbox.sceneTheme ?? ""] ?? "Foto"}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={close}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-white font-serif font-black text-xl uppercase leading-none">
                {SCENE_LABELS[lightbox.sceneTheme ?? ""] ?? lightbox.sceneTheme}
              </p>
              <p className="text-white/40 text-xs uppercase tracking-widest mt-1">
                {new Date(lightbox.createdAt).toLocaleDateString("nl-NL", {
                  day: "numeric", month: "long", year: "numeric",
                })}
                {images.length > 1 && ` — ${currentIndex + 1} / ${images.length}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {lightbox.previewUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  download
                  className="border border-white text-white text-xs uppercase tracking-widest px-4 py-2 hover:bg-white hover:text-black transition-colors"
                >
                  {lightbox.previewUrls.length > 1 ? `Downloaden ${i + 1}` : "Downloaden"}
                </a>
              ))}
              <button
                onClick={close}
                className="text-white/60 hover:text-white transition-colors text-2xl leading-none ml-2"
                aria-label="Sluiten"
              >
                ×
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
            {currentIndex > 0 && (
              <button
                className="absolute left-4 text-white/60 hover:text-white transition-colors text-4xl leading-none"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Vorige"
              >
                ‹
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.previewUrls[0]}
              alt={SCENE_LABELS[lightbox.sceneTheme ?? ""] ?? "Foto"}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {currentIndex < images.length - 1 && (
              <button
                className="absolute right-4 text-white/60 hover:text-white transition-colors text-4xl leading-none"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Volgende"
              >
                ›
              </button>
            )}
          </div>

          <div className="shrink-0 h-6" />
        </div>
      )}
    </>
  );
}
