"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SCENE_THEMES, PLATFORMS, PLATFORM_COLORS, type PlatformId } from "@/lib/scenes";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { useLanguage } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/translations";

type SceneTheme = typeof SCENE_THEMES[number];
type FileStatus = "queued" | "uploading" | "processing" | "done" | "error";

interface BatchFile {
  id: string;
  file: File;
  preview: string;
  status: FileStatus;
  imageId?: string;
}

export function BatchForm({ batchLimit, creditsLeft }: { batchLimit: number; creditsLeft: number }) {
  const { t } = useLanguage();
  const [selectedPlatformId, setSelectedPlatformId] = useState<PlatformId | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<SceneTheme>(SCENE_THEMES[0]);
  const [sceneConfirmed, setSceneConfirmed] = useState(false);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const effectiveLimit = Math.min(batchLimit, creditsLeft);

  const STATUS_KEY: Record<FileStatus, TranslationKey> = {
    queued:     "status_queued",
    uploading:  "status_uploading",
    processing: "status_processing",
    done:       "status_done",
    error:      "status_error",
  };

  const platformScenes = selectedPlatformId
    ? SCENE_THEMES.filter((s) => {
        const p = PLATFORMS.find((pl) => pl.id === selectedPlatformId);
        return p ? (p.scenes as readonly string[]).includes(s.id) : false;
      })
    : [];

  function selectPlatform(pid: PlatformId) {
    const platform = PLATFORMS.find((p) => p.id === pid)!;
    const firstScene = SCENE_THEMES.find((s) => s.id === platform.scenes[0])!;
    setSelectedPlatformId(pid);
    setSelectedTheme(firstScene);
    setSceneConfirmed(false);
  }

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: geen afbeelding`); return false; }
      if (f.size > MAX_UPLOAD_BYTES) { toast.error(`${f.name}: te groot (max 20MB)`); return false; }
      return true;
    });

    setFiles((prev) => {
      const slots = effectiveLimit - prev.length;
      if (slots <= 0) { toast.error(t("max_reached")); return prev; }
      const add = valid.slice(0, slots);
      if (valid.length > slots) toast.error(`Alleen de eerste ${slots} foto's zijn toegevoegd`);
      return [
        ...prev,
        ...add.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          preview: URL.createObjectURL(f),
          status: "queued" as FileStatus,
        })),
      ];
    });
  }, [effectiveLimit, t]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  function remove(id: string) {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((x) => x.id !== id);
    });
  }

  function updateStatus(id: string, status: FileStatus, imageId?: string) {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status, ...(imageId ? { imageId } : {}) } : f));
  }

  async function processFile(bf: BatchFile): Promise<void> {
    updateStatus(bf.id, "uploading");

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: bf.file.type, filename: bf.file.name, fileSize: bf.file.size }),
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error ?? t("error_upload_failed"));
    }
    const { uploadUrl, imageId } = await uploadRes.json();

    await fetch(uploadUrl, { method: "PUT", body: bf.file, headers: { "Content-Type": bf.file.type } });

    const jobRes = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, sceneTheme: selectedTheme.id, customPrompt: "" }),
    });
    if (!jobRes.ok) {
      const err = await jobRes.json().catch(() => ({}));
      throw new Error(err.error ?? t("error_start_failed"));
    }

    updateStatus(bf.id, "processing", imageId);
    pollFile(bf.id, imageId);
  }

  function pollFile(batchId: string, imageId: string) {
    const start = Date.now();
    pollRefs.current[batchId] = setInterval(async () => {
      if (Date.now() - start > 3 * 60 * 1000) {
        clearInterval(pollRefs.current[batchId]);
        updateStatus(batchId, "error");
        return;
      }
      const res = await fetch(`/api/jobs?imageId=${imageId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "DONE") {
        clearInterval(pollRefs.current[batchId]);
        updateStatus(batchId, "done");
      } else if (data.status === "FAILED") {
        clearInterval(pollRefs.current[batchId]);
        updateStatus(batchId, "error");
      }
    }, 3000);
  }

  async function startBatch() {
    if (files.length === 0 || !sceneConfirmed) return;
    setRunning(true);
    for (const bf of files.filter((f) => f.status === "queued")) {
      try {
        await processFile(bf);
      } catch (err) {
        updateStatus(bf.id, "error");
        toast.error(`${bf.file.name}: ${err instanceof Error ? err.message : t("status_error")}`);
      }
    }
    setRunning(false);
    toast.success(t("batch_sent"));
  }

  const queued  = files.filter((f) => f.status === "queued").length;
  const done    = files.filter((f) => f.status === "done").length;
  const errored = files.filter((f) => f.status === "error").length;

  // ── Step 1: Platform picker ──────────────────────────────────────────────────
  if (!selectedPlatformId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-widest text-black/50">{t("choose_platform")}</p>
        <div className="flex flex-col gap-px bg-black">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => selectPlatform(platform.id)}
              className="bg-white hover:bg-black hover:text-white group text-left px-4 py-4 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: PLATFORM_COLORS[platform.id] }}
                />
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest leading-none mb-1">
                    {t(`platform_${platform.id}` as TranslationKey)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-black/40 group-hover:text-white/60 transition-colors">
                    {t(`platform_${platform.id}_desc` as TranslationKey)} · {platform.scenes.length} {t("scenes_label")}
                  </p>
                </div>
              </div>
              <span className="text-black/30 group-hover:text-white/60 transition-colors">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2: Scene selection ──────────────────────────────────────────────────
  if (!sceneConfirmed) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-black pb-1">
          <h2 className="text-xs uppercase tracking-widest font-medium">
            {t("scene_for_all")}
          </h2>
          <button
            onClick={() => setSelectedPlatformId(null)}
            className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors"
          >
            {t(`platform_${selectedPlatformId}` as TranslationKey)}
            <span className="ml-1 text-black/20">↩</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-black">
          {platformScenes.map((theme) => {
            const selected = selectedTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`relative text-left transition-colors ${
                  selected ? "bg-black text-white" : "bg-white hover:bg-black/5"
                }`}
              >
                <div
                  className="w-full aspect-[4/3] relative"
                  style={{ background: `linear-gradient(145deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-black text-white text-[9px] flex items-center justify-center">✓</span>
                  )}
                </div>
                <p className="px-3 py-2.5 text-xs uppercase tracking-widest font-medium leading-snug">
                  {t(`scene_${theme.id}` as TranslationKey)}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setSceneConfirmed(true)}
          className="w-full bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors"
        >
          {t("select_scene")}
        </button>
      </div>
    );
  }

  // ── Step 3: Photos + start ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">

      {/* Confirmed scene summary */}
      <div className="flex items-center justify-between border-b border-black pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 shrink-0"
            style={{ background: `linear-gradient(145deg, ${selectedTheme.gradient[0]}, ${selectedTheme.gradient[1]})` }}
          />
          <p className="text-xs uppercase tracking-widest font-medium">
            {t(`scene_${selectedTheme.id}` as TranslationKey)}
          </p>
        </div>
        <button
          onClick={() => !running && setSceneConfirmed(false)}
          disabled={running}
          className="text-[10px] uppercase tracking-widest text-black/40 hover:text-black transition-colors disabled:opacity-30"
        >
          {t("back")}
        </button>
      </div>

      {/* Drop zone */}
      <div>
        <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
          {t("photos_label")} ({files.length}/{effectiveLimit})
        </h2>
        <label
          className={`flex flex-col items-center justify-center py-10 border-2 cursor-pointer transition-colors ${
            dragOver ? "border-black bg-black/5" : "border-black/20 hover:border-black"
          } ${files.length >= effectiveLimit ? "pointer-events-none opacity-40" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="font-serif font-bold text-xl uppercase mb-1">{t("drop_photos")}</p>
          <p className="text-xs uppercase tracking-widest text-black/40">{t("or_browse_max")} {effectiveLimit} {t("photos_unit")}</p>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
          />
        </label>
      </div>

      {/* File grid + start */}
      {files.length > 0 && (
        <div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-px bg-black mb-4">
            {files.map((bf) => (
              <div key={bf.id} className="bg-white relative group aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bf.preview} alt={bf.file.name} className="w-full h-full object-cover" />
                <div className={`absolute inset-0 flex flex-col items-center justify-center ${
                  bf.status === "queued" ? "bg-transparent" : "bg-white/80"
                }`}>
                  {bf.status !== "queued" && (
                    <span className={`text-[10px] uppercase tracking-widest font-medium ${
                      bf.status === "done" ? "text-black" : bf.status === "error" ? "text-black/40" : "text-black animate-pulse"
                    }`}>
                      {t(STATUS_KEY[bf.status])}
                    </span>
                  )}
                </div>
                {bf.status === "queued" && !running && (
                  <button
                    onClick={() => remove(bf.id)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black text-white text-[10px] items-center justify-center hidden group-hover:flex"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border border-black px-4 py-3">
            <p className="text-xs uppercase tracking-widest font-medium text-black/60">
              {queued} {t("status_queued").toLowerCase()} · {done} {t("status_done").toLowerCase()}
              {errored > 0 ? ` · ${errored} ${t("status_error").toLowerCase()}` : ""}
            </p>
            <button
              onClick={startBatch}
              disabled={running || queued === 0}
              className="bg-black text-white px-6 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors disabled:opacity-40"
            >
              {running ? t("starting") : `${t("start_batch")} (${queued})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
