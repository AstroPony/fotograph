"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { SCENE_THEMES, PLATFORMS, PLATFORM_COLORS, type PlatformId } from "@/lib/scenes";
import { useLanguage } from "@/components/language-provider";
import type { TranslationKey } from "@/lib/translations";

type SceneTheme = typeof SCENE_THEMES[number];
type Stage = "idle" | "ready" | "uploading" | "removing-bg" | "generating" | "done" | "error";
type Step = 1 | 2 | 3;

// ── Sub-components ────────────────────────────────────────────────────────────

function DropZone({ onFile, dragOver, setDragOver }: {
  onFile: (f: File) => void;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  return (
    <label
      className={`flex-1 max-h-[450px] flex flex-col items-center justify-center border-2 cursor-pointer transition-colors ${
        dragOver ? "border-black bg-black/5" : "border-black/20 hover:border-black"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
    >
      <div className="text-center pointer-events-none py-12 px-8">
        <p className="font-serif font-bold text-3xl uppercase mb-3">{t("drop_here")}</p>
        <p className="text-xs uppercase tracking-widest text-black/40">{t("or_browse")}</p>
        <p className="text-xs text-black/30 mt-2">{t("file_types")}</p>
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
  const { t } = useLanguage();
  if (!previewFile) {
    return <DropZone onFile={onFile} dragOver={dragOver} setDragOver={setDragOver} />;
  }
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="max-h-[450px] min-h-0 bg-black/5 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewFile} alt="Geüpload" className="w-full max-h-[450px] object-contain" />
      </div>
      <div className="flex items-center gap-3 mt-auto border-t border-black/10 pt-3">
        <button onClick={onReset} className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors underline underline-offset-4 shrink-0">
          {t("change_photo")}
        </button>
        <button onClick={onNext} className="flex-1 bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors">
          {t("select_scene")}
        </button>
      </div>
    </div>
  );
}

function StepPlatform({ onSelect, onBack }: {
  onSelect: (id: PlatformId) => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <p className="text-xs uppercase tracking-widest text-black/50">{t("choose_platform")}</p>
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
        <div className="flex flex-col gap-px bg-black">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onSelect(platform.id)}
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
      <div className="flex items-center pt-2 border-t border-black/10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">
          {t("back")}
        </button>
      </div>
    </div>
  );
}

const MAX_USER_TEXT = 200;

function StepScene({ scenes, selectedTheme, onSelect, onBack, onGenerate, userText, setUserText, tier }: {
  scenes: SceneTheme[];
  selectedTheme: SceneTheme;
  onSelect: (t: SceneTheme) => void;
  onBack: () => void;
  onGenerate: () => void;
  userText: string;
  setUserText: (t: string) => void;
  tier: string;
}) {
  const { t } = useLanguage();
  const canCustomise = tier !== "FREE";
  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <p className="text-xs uppercase tracking-widest text-black/50">{t("choose_style")}</p>
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
        <div className="grid grid-cols-2 gap-px bg-black">
          {scenes.map((theme) => {
            const selected = selectedTheme.id === theme.id;
            const sceneKey = `scene_${theme.id}` as TranslationKey;
            return (
              <button
                key={theme.id}
                onClick={() => onSelect(theme)}
                className={`relative text-left transition-colors ${
                  selected ? "bg-black text-white" : "bg-white hover:bg-black/5"
                }`}
              >
                <div
                  className="w-full aspect-[4/3] relative"
                  style={{ background: `linear-gradient(145deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-black text-white text-[9px] flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </div>
                <p className="px-3 py-2.5 text-xs uppercase tracking-widest font-medium leading-snug">
                  {t(sceneKey)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className="block text-xs uppercase tracking-widest text-black/50 mb-1.5">
            {t("add_details")}
            {!canCustomise && (
              <Link href="/upgrade" className="ml-2 text-black underline underline-offset-2 hover:text-black/60">
                {t("starter_required")}
              </Link>
            )}
          </label>
          <textarea
            disabled={!canCustomise}
            value={userText}
            onChange={(e) => setUserText(e.target.value.slice(0, MAX_USER_TEXT))}
            placeholder={canCustomise ? t("custom_placeholder") : t("upgrade_for_custom")}
            rows={2}
            className="w-full border border-black/20 px-3 py-2 text-xs resize-none focus:outline-none focus:border-black disabled:bg-black/5 disabled:text-black/30 disabled:cursor-not-allowed"
          />
          {canCustomise && (
            <p className="text-[10px] text-black/30 mt-1 text-right">{userText.length}/{MAX_USER_TEXT}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-black/10">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors shrink-0">
          {t("back")}
        </button>
        <button onClick={onGenerate} className="flex-1 bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors">
          {t("generate")}
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
  const { t } = useLanguage();

  const stageLabel = (): string => {
    if (stage === "uploading") return t("uploading");
    if (stage === "removing-bg") return t("removing_bg");
    if (stage === "generating") return t("generating");
    return t("processing");
  };

  if (stage === "error") {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-6">
        <p className="font-serif font-black text-3xl uppercase">{t("failed")}</p>
        <p className="text-xs uppercase tracking-widest text-black/40">{t("something_wrong")}</p>
        <button onClick={onReset} className="border border-black px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors">
          {t("try_again")}
        </button>
      </div>
    );
  }

  if (stage === "done" && resultUrls.length > 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultUrls[0]} alt="Resultaat" className="w-full aspect-square object-cover" />
        </div>
        <div className="flex flex-col gap-2 mt-auto border-t border-black/10 pt-3">
          <a href={resultUrls[0]} download className="w-full bg-black text-white px-6 py-4 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors text-center">
            {t("download")}
          </a>
          <button onClick={onReset} className="w-full border border-black px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors">
            {t("another_photo")}
          </button>
          <Link href="/dashboard" className="w-full border border-black/30 px-6 py-3 text-xs uppercase tracking-widest font-medium text-black/40 hover:border-black hover:text-black transition-colors text-center">
            {t("view_all")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 border-2 border-black/10 border-t-black rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest font-medium animate-pulse">
          {stageLabel()}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-black/30 text-center max-w-xs">
          {t("processing_time")}<br />{t("safe_to_close")}
        </p>
      </div>
      <div className="mt-auto border-t border-black/10 pt-3">
        <button onClick={onReset} className="text-[10px] uppercase tracking-widest text-black/30 hover:text-black transition-colors">
          {t("hide")}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function UploadPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useLanguage();
  const [showWelcome, setShowWelcome] = useState(searchParams.get("welcome") === "1");
  const [step, setStep] = useState<Step>(1);
  const [stage, setStage] = useState<Stage>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<PlatformId | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<SceneTheme>(SCENE_THEMES[0]);
  const [userText, setUserText] = useState("");
  const [tier, setTier] = useState("FREE");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.tier) setTier(d.tier); })
      .catch(() => {});
  }, []);

  const pickFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(t("error_not_image")); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error(t("error_too_large")); return; }
    setSelectedFile(file);
    setPreviewFile(URL.createObjectURL(file));
    setStage("ready");
  }, [t]);

  async function generate() {
    if (!selectedFile) return;
    setStep(3);
    posthog?.capture("generation_started", { scene: selectedTheme.id, platform: selectedPlatformId, has_custom_text: userText.trim().length > 0 });
    try {
      setStage("uploading");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: selectedFile.type, filename: selectedFile.name, fileSize: selectedFile.size }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? t("error_upload_failed")); }
      const { uploadUrl, imageId: id } = await res.json();
      await fetch(uploadUrl, { method: "PUT", body: selectedFile, headers: { "Content-Type": selectedFile.type } });

      setStage("removing-bg");
      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id, sceneTheme: selectedTheme.id, customPrompt: userText.trim() }),
      });
      if (!jobRes.ok) { const err = await jobRes.json().catch(() => ({})); throw new Error(err.error ?? t("error_start_failed")); }

      setStage("generating");
      pollStatus(id);
    } catch (err) {
      setStage("error");
      toast.error(err instanceof Error ? err.message : t("something_wrong"));
    }
  }

  function pollStatus(id: string) {
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > 3 * 60 * 1000) {
        clearInterval(pollRef.current!);
        setStage("error");
        toast.error(t("error_timeout"));
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
        posthog?.capture("generation_completed", { scene: selectedTheme.id, platform: selectedPlatformId });
      } else if (data.status === "FAILED") {
        clearInterval(pollRef.current!);
        setStage("error");
        toast.error(t("error_generate_failed"));
      }
    }, 2000);
  }

  const stepLabel = (s: Step): string => {
    if (s === 1) return t("step_photo");
    if (s === 2) return selectedPlatformId ? t("step_scene") : t("step_platform");
    return stage === "done" ? t("step_done") : stage === "error" ? t("step_failed") : t("step_generating");
  };

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep(1); setStage("idle");
    setSelectedFile(null); setPreviewFile(null); setResultUrls([]);
    setSelectedPlatformId(null);
  }

  const platformScenes = selectedPlatformId
    ? SCENE_THEMES.filter((s) => {
        const p = PLATFORMS.find((pl) => pl.id === selectedPlatformId);
        return p ? (p.scenes as readonly string[]).includes(s.id) : false;
      })
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 min-h-0 max-w-xl mx-auto w-full px-6 py-8 flex flex-col overflow-hidden">

        {showWelcome && (
          <div className="border border-black bg-black text-white px-6 py-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-medium text-white/50 mb-0.5">{t("welcome_title")}</p>
              <p className="text-sm font-medium">{t("welcome_prefix")} <strong>{t("welcome_credits")}</strong> — {t("welcome_suffix")}</p>
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
              {stepLabel(step)}
            </span>
          </div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors">
            {t("back_dashboard")}
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
        {step === 2 && !selectedPlatformId && (
          <StepPlatform
            onSelect={(pid) => {
              const platform = PLATFORMS.find((p) => p.id === pid)!;
              const firstScene = SCENE_THEMES.find((s) => s.id === platform.scenes[0])!;
              setSelectedPlatformId(pid);
              setSelectedTheme(firstScene);
            }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 2 && selectedPlatformId && (
          <StepScene
            scenes={platformScenes}
            selectedTheme={selectedTheme}
            onSelect={setSelectedTheme}
            onBack={() => setSelectedPlatformId(null)}
            onGenerate={generate}
            userText={userText}
            setUserText={setUserText}
            tier={tier}
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
