"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SCENE_THEMES } from "@/lib/scenes";

type SceneTheme = typeof SCENE_THEMES[number];

type Stage = "idle" | "ready" | "uploading" | "removing-bg" | "generating" | "done" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "",
  ready: "",
  uploading: "Uploaden...",
  "removing-bg": "Achtergrond verwijderen...",
  generating: "Scène genereren...",
  done: "Klaar",
  error: "Mislukt",
};

const STEPS = ["Foto", "Scène", "Genereren"];

function stepState(step: number, stage: Stage): "active" | "done" | "pending" {
  const order: Stage[] = ["idle", "ready", "uploading", "removing-bg", "generating", "done"];
  const idx = order.indexOf(stage);
  if (stage === "error") return "pending";
  if (step === 1) return idx >= 1 ? "done" : "active";
  if (step === 2) return idx >= 2 ? "done" : idx === 1 ? "active" : "pending";
  if (step === 3) return stage === "done" ? "done" : idx >= 2 ? "active" : "pending";
  return "pending";
}

function UploadPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
  const [stage, setStage] = useState<Stage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<SceneTheme>(SCENE_THEMES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function dismissWelcome() {
    setShowWelcome(false);
    router.replace("/upload", { scroll: false });
  }

  function pickFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload een afbeelding (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Bestand is te groot (max 20MB)");
      return;
    }
    setSelectedFile(file);
    setPreviewFile(URL.createObjectURL(file));
    setStage("ready");
  }

  async function generate() {
    if (!selectedFile) return;

    try {
      setStage("uploading");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: selectedFile.type,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload mislukt");
      }

      const { uploadUrl, imageId: id } = await res.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type },
      });

      setStage("removing-bg");
      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId: id,
          sceneTheme: selectedTheme.id,
          customPrompt: selectedTheme.prompt,
        }),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Verwerking starten mislukt");
      }

      setStage("generating");
      pollStatus(id);
    } catch (err) {
      setStage("error");
      toast.error(err instanceof Error ? err.message : "Onbekende fout");
    }
  }

  function pollStatus(id: string) {
    const TIMEOUT_MS = 3 * 60 * 1000;
    const startedAt = Date.now();

    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(pollRef.current!);
        setStage("error");
        toast.error("Verwerking duurt te lang. Probeer opnieuw.");
        return;
      }

      const res = await fetch(`/api/jobs?imageId=${id}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "REMOVING_BG") setStage("removing-bg");
      else if (data.status === "GENERATING" || data.status === "UPSCALING") setStage("generating");
      else if (data.status === "DONE") {
        clearInterval(pollRef.current!);
        setPreviewUrls(data.previewUrls ?? []);
        setStage("done");
        toast.success("Foto's zijn klaar!");
      } else if (data.status === "FAILED") {
        clearInterval(pollRef.current!);
        setStage("error");
        toast.error("Genereren mislukt. Probeer opnieuw.");
      }
    }, 2000);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) pickFile(file);
  }, []);

  const isProcessing = stage === "uploading" || stage === "removing-bg" || stage === "generating";

  function reset() {
    setStage("idle");
    setSelectedFile(null);
    setPreviewFile(null);
    setPreviewUrls([]);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {showWelcome && (
          <div className="border border-black bg-black text-white px-6 py-4 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-medium text-white/50 mb-0.5">Welkom bij Fotograph</p>
              <p className="text-sm font-medium">Je hebt <strong>10 gratis credits</strong> — elke credit = één productfoto. Geen creditcard nodig.</p>
            </div>
            <button onClick={dismissWelcome} className="text-white/50 hover:text-white text-xs uppercase tracking-widest shrink-0">
              Sluiten
            </button>
          </div>
        )}

        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Nieuwe foto</p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Foto genereren
          </h1>
        </div>

        {/* Step indicators */}
        <div className="flex items-center mb-10 border border-black">
          {STEPS.map((step, i) => {
            const state = stepState(i + 1, stage);
            return (
              <div
                key={step}
                className={`flex-1 px-4 py-3 text-xs uppercase tracking-widest font-medium border-r border-black last:border-r-0 flex items-center gap-2 ${
                  state === "active" ? "bg-black text-white" : state === "done" ? "bg-black/10 text-black/50" : "text-black/30"
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] border ${state === "active" ? "border-white" : "border-current"}`}>
                  {state === "done" ? "✓" : i + 1}
                </span>
                {step}
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-black">
          {/* Left — upload + preview */}
          <div className="bg-white p-6 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-2">
              01 — Productfoto
            </h2>

            {stage === "idle" ? (
              <label
                className={`flex flex-col items-center justify-center aspect-square border-2 cursor-pointer transition-colors ${
                  dragOver ? "border-black bg-black/5" : "border-black/20 hover:border-black"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="text-center pointer-events-none p-8">
                  <p className="font-serif font-bold text-2xl uppercase mb-3">Sleep hier</p>
                  <p className="text-xs uppercase tracking-widest text-black/40">of klik om te bladeren</p>
                  <p className="text-xs text-black/30 mt-2">JPG · PNG · WEBP · max 20MB</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }} />
              </label>
            ) : previewFile ? (
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewFile} alt="Origineel" className="w-full h-full object-contain border border-black/10" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3">
                    <p className="text-xs uppercase tracking-widest font-medium animate-pulse">
                      {STAGE_LABELS[stage]}
                    </p>
                    <div className="w-32 h-px bg-black/10 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-black animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Replace file when in ready state */}
            {stage === "ready" && (
              <button
                onClick={reset}
                className="text-xs uppercase tracking-widest text-black/40 hover:text-black underline underline-offset-4 text-left"
              >
                Andere foto kiezen
              </button>
            )}

            {stage === "error" && (
              <button
                onClick={reset}
                className="border border-black px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
              >
                Opnieuw proberen
              </button>
            )}
          </div>

          {/* Right — scene + generate + result */}
          <div className="bg-white p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-2 mb-4">
                02 — Scène
              </h2>
              <div className="flex flex-col gap-px bg-black/10">
                {SCENE_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => !isProcessing && setSelectedTheme(theme)}
                    disabled={isProcessing}
                    className={`px-4 py-2.5 text-left text-xs uppercase tracking-widest font-medium transition-colors ${
                      selectedTheme.id === theme.id
                        ? "bg-black text-white"
                        : "bg-white hover:bg-black/5 disabled:opacity-40"
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button — shown when file is ready */}
            {stage === "ready" && (
              <button
                onClick={generate}
                className="w-full bg-black text-white px-4 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors"
              >
                Genereer foto →
              </button>
            )}

            {/* Result */}
            {stage === "done" && previewUrls.length > 0 && (
              <div>
                <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-2 mb-4">
                  03 — Resultaat
                </h2>
                <div className="grid grid-cols-1 gap-px bg-black">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Gegenereerd ${i + 1}`} className="w-full aspect-square object-cover" />
                      <a
                        href={url}
                        download
                        className="absolute inset-x-0 bottom-0 bg-black text-white text-xs uppercase tracking-widest font-medium py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Downloaden
                      </a>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={reset}
                    className="w-full border border-black px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
                  >
                    Nog een foto
                  </button>
                  <Link
                    href="/dashboard"
                    className="w-full border border-black/30 px-4 py-2 text-xs uppercase tracking-widest font-medium text-black/50 hover:border-black hover:text-black transition-colors text-center"
                  >
                    Bekijk al je foto&apos;s →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadPageInner />
    </Suspense>
  );
}
