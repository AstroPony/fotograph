"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { SCENE_THEMES } from "@/lib/scenes";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

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
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<SceneTheme>(SCENE_THEMES[0]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const effectiveLimit = Math.min(batchLimit, creditsLeft);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: geen afbeelding`); return false; }
      if (f.size > MAX_UPLOAD_BYTES) { toast.error(`${f.name}: te groot (max 20MB)`); return false; }
      return true;
    });

    setFiles((prev) => {
      const slots = effectiveLimit - prev.length;
      if (slots <= 0) { toast.error(`Maximum van ${effectiveLimit} foto's bereikt`); return prev; }
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
  }, [effectiveLimit]);

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
      throw new Error(err.error ?? "Upload mislukt");
    }
    const { uploadUrl, imageId } = await uploadRes.json();

    await fetch(uploadUrl, { method: "PUT", body: bf.file, headers: { "Content-Type": bf.file.type } });

    const jobRes = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId, sceneTheme: selectedTheme.id, customPrompt: selectedTheme.prompt }),
    });
    if (!jobRes.ok) {
      const err = await jobRes.json().catch(() => ({}));
      throw new Error(err.error ?? "Verwerking starten mislukt");
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
    if (files.length === 0) return;
    setRunning(true);
    for (const bf of files.filter((f) => f.status === "queued")) {
      try {
        await processFile(bf);
      } catch (err) {
        updateStatus(bf.id, "error");
        toast.error(`${bf.file.name}: ${err instanceof Error ? err.message : "Fout"}`);
      }
    }
    setRunning(false);
    toast.success("Alle foto's zijn verstuurd — resultaten verschijnen op het dashboard.");
  }

  const STATUS_LABEL: Record<FileStatus, string> = {
    queued: "Wacht", uploading: "Uploaden", processing: "Bezig", done: "Klaar", error: "Fout",
  };

  const queued = files.filter((f) => f.status === "queued").length;
  const done = files.filter((f) => f.status === "done").length;
  const errored = files.filter((f) => f.status === "error").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Scene selector */}
      <div>
        <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
          01 — Scène (voor alle foto&apos;s)
        </h2>
        <div className="flex flex-wrap gap-px bg-black/10 border border-black/10">
          {SCENE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => !running && setSelectedTheme(theme)}
              disabled={running}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors ${
                selectedTheme.id === theme.id ? "bg-black text-white" : "bg-white hover:bg-black/5 disabled:opacity-40"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-4">
          02 — Foto&apos;s ({files.length}/{effectiveLimit})
        </h2>
        <label
          className={`flex flex-col items-center justify-center py-10 border-2 cursor-pointer transition-colors ${
            dragOver ? "border-black bg-black/5" : "border-black/20 hover:border-black"
          } ${files.length >= effectiveLimit ? "pointer-events-none opacity-40" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="font-serif font-bold text-xl uppercase mb-1">Sleep foto&apos;s hier</p>
          <p className="text-xs uppercase tracking-widest text-black/40">of klik om te bladeren · max {effectiveLimit} foto&apos;s</p>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
          />
        </label>
      </div>

      {/* File grid */}
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
                      {STATUS_LABEL[bf.status]}
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

          {/* Summary + action */}
          <div className="flex items-center justify-between border border-black px-4 py-3">
            <p className="text-xs uppercase tracking-widest font-medium text-black/60">
              {queued} wacht · {done} klaar{errored > 0 ? ` · ${errored} fout` : ""}
            </p>
            <button
              onClick={startBatch}
              disabled={running || queued === 0}
              className="bg-black text-white px-6 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors disabled:opacity-40"
            >
              {running ? "Bezig…" : `Start batch (${queued})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
