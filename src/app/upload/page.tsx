"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { SCENE_THEMES } from "@/lib/scenes";

type SceneTheme = typeof SCENE_THEMES[number];
// step=3 is only reachable via generate() which always transitions stage away from idle/ready.
// Invariant: step === 3 → stage ∈ {uploading, removing-bg, generating, done, error}
type Stage = "idle" | "ready" | "uploading" | "removing-bg" | "generating" | "done" | "error";
type Step = 1 | 2 | 3;

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  uploading: "Uploaden...",
  "removing-bg": "Achtergrond verwijderen...",
  generating: "Scène genereren...",
};

const STEP_LABELS: Record<Step, (stage: Stage) => string> = {
  1: () => "Foto",
  2: () => "Scène",
  3: (stage) => stage === "done" ? "Klaar" : stage === "error" ? "Mislukt" : "Genereren",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function DropZone({ onFile, dragOver, setDragOver }: {
  onFile: (f: File) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex-1 flex flex-col items-center justify-center border-2 cursor-pointer transition-colors min-h-[500px] ${
        dragOver ? "border-black bg-black/5" : "border-black/20 hover:border-black"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <div className="text-center pointer-events-none py-12 px-8">
        <p className="font-serif font-bold text-3xl uppercase mb-3">Sleep hier</p>
        <p className="text-xs uppercase tracking-widest text-black/40">of klik om te bladeren</p>
        <p className="text-xs text-black/30 mt-2">JPG · PNG · WEBP · max 20MB</p>
      </div>
      <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );
}

function StepUpload({ previewFile, onFile, onNext, onReset, dragOver, setDragOver }: {
  previewFile: string | null;
  onFile: (f: File) => void;
  onNext: () => void;
  onReset: () => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  if (!previewFile) {
    return <DropZone onFile={onFile} dragOver={dragOver} setDragOver={setDragOver} />;
  }
  return (
    <div className="flex flex-col flex-1 min-h-[500px]">
      <div className="flex-1 bg-black/5 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewFile} alt="Geüpload" className="w-full max-h-[60vh] object-contain" />
      </div>
      <div className="flex items-center gap-3 mt-auto border-t border-black/10 pt-3">
        <button onClick={onReset} className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors underline underline-offset-4 shrink-0">
          Andere foto
        </button>
        <button onClick={onNext} className="flex-1 bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors">
          Selecteer scène →
        </button>
      </div>
    </div>
  );
}

function StepScene({ selectedTheme, onSelect, onBack, onGenerate }: {
  selectedTheme: SceneTheme;
  onSelect: (t: SceneTheme) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-[500px] gap-3">
      <p className="text-xs uppercase tracking-widest text-black/50">Kies een stijl voor je foto</p>
      <div className="flex-1 overflow-y-auto -mx-6 px-6">
        <div className="grid grid-cols-2 gap-px bg-black">
          {SCENE_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onSelect(theme)}
              className={`relative p-5 text-left transition-colors ${
                selectedTheme.id === theme.id ? "bg-black text-white" : "bg-white hover:bg-black/5"
              }`}
            >
              <p className="text-xs uppercase tracking-widest font-medium leading-snug">
                {theme.label}
              </p>
              {selectedTheme.id === theme.id && (
                <span className="absolute top-3 right-3 text-[10px]">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-black/10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors shrink-0">
          ← Terug
        </button>
        <button onClick={onGenerate} className="flex-1 bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors">
          Genereer foto →
        </button>
      </div>
    </div>
  );
}

function StepResult({ stage, resultUrls, onReset }: {
  stage: Stage;
  resultUrls: string[];
  onReset: () => void;
}) {
  if (stage === "error") {
    return (
      <div className="flex flex-col flex-1 min-h-[500px] items-center justify-center gap-6">
        <p className="font-serif font-black text-3xl uppercase">Mislukt</p>
        <p className="text-xs uppercase tracking-widest text-black/40">Er is iets misgegaan</p>
        <button onClick={onReset} className="border border-black px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors">
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (stage === "done" && resultUrls.length > 0) {
    return (
      <div className="flex flex-col flex-1 min-h-[500px]">
        <div className="flex-1 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrls[0]} alt="Resultaat" className="w-full aspect-square object-cover" />
        </div>
        <div className="flex flex-col gap-2 mt-auto border-t border-black/10 pt-3">
          <a href={resultUrls[0]} download className="w-full bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors text-center">
            Downloaden
          </a>
          <button onClick={onReset} className="w-full border border-black px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors">
            Nog een foto
          </button>
          <Link href="/dashboard" className="w-full border border-black/30 px-6 py-3 text-xs uppercase tracking-widest font-medium text-black/40 hover:border-black hover:text-black transition-colors text-center">
            Bekijk al je foto&apos;s →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-[500px]">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-2 border-black/10 border-t-black rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest font-medium animate-pulse">
          {STAGE_LABELS[stage] ?? "Bezig..."}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-black/30 text-center max-w-xs">
          Dit duurt ongeveer 30–60 seconden.<br />Je kunt de pagina veilig sluiten.
        </p>
      </div>
      <div className="mt-auto border-t border-black/10 pt-3">
        <button onClick={onReset} className="text-[10px] uppercase tracking-widest text-black/30 hover:text-black transition-colors">
          Verbergen
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function UploadPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
  const [step, setStep] = useState<Step>(1);
  const [stage, setStage] = useState<Stage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<SceneTheme>(SCENE_THEMES[0]);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pickFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Upload een afbeelding (JPG, PNG, WEBP)"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Bestand is te groot (max 20MB)"); return; }
    setSelectedFile(file);
    setPreviewFile(URL.createObjectURL(file));
    setStage("ready");
  }, []);

  async function generate() {
    if (!selectedFile) return;
    setStep(3);
    try {
      setStage("uploading");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: selectedFile.type, filename: selectedFile.name, fileSize: selectedFile.size }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Upload mislukt"); }
      const { uploadUrl, imageId: id } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: selectedFile, headers: { "Content-Type": selectedFile.type } });

      setStage("removing-bg");
      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id, sceneTheme: selectedTheme.id, customPrompt: selectedTheme.prompt }),
      });
      if (!jobRes.ok) { const err = await jobRes.json().catch(() => ({})); throw new Error(err.error ?? "Verwerking starten mislukt"); }

      setStage("generating");
      pollStatus(id);
    } catch (err) {
      setStage("error");
      toast.error(err instanceof Error ? err.message : "Onbekende fout");
    }
  }

  function pollStatus(id: string) {
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 3 * 60 * 1000) {
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
        setResultUrls(data.previewUrls ?? []);
        setStage("done");
      } else if (data.status === "FAILED") {
        clearInterval(pollRef.current!);
        setStage("error");
        toast.error("Genereren mislukt. Probeer opnieuw.");
      }
    }, 2000);
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep(1); setStage("idle");
    setSelectedFile(null); setPreviewFile(null); setResultUrls([]);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-8 flex flex-col">

        {showWelcome && (
          <div className="border border-black bg-black text-white px-6 py-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-medium text-white/50 mb-0.5">Welkom bij Fotograph</p>
              <p className="text-sm font-medium">Je hebt <strong>10 gratis credits</strong> — elke credit = één productfoto.</p>
            </div>
            <button
              onClick={() => { setShowWelcome(false); router.replace("/upload", { scroll: false }); }}
              className="text-white/50 hover:text-white text-xs uppercase tracking-widest shrink-0"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? "bg-black" : step > s ? "bg-black/40" : "bg-black/15"}`} />
            ))}
            <span className="text-xs uppercase tracking-widest text-black/40 ml-1">
              {STEP_LABELS[step](stage)}
            </span>
          </div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">
            ← Dashboard
          </Link>
        </div>

        {step === 1 && (
          <StepUpload
            previewFile={previewFile}
            onFile={pickFile}
            onNext={() => setStep(2)}
            onReset={reset}
            dragOver={dragOver}
            setDragOver={setDragOver}
          />
        )}
        {step === 2 && (
          <StepScene
            selectedTheme={selectedTheme}
            onSelect={setSelectedTheme}
            onBack={() => setStep(1)}
            onGenerate={generate}
          />
        )}
        {step === 3 && (
          <StepResult stage={stage} resultUrls={resultUrls} onReset={reset} />
        )}

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
