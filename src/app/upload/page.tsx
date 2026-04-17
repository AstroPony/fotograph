"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Stage =
  | "idle"
  | "uploading"
  | "removing-bg"
  | "generating"
  | "done"
  | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Upload een productfoto",
  uploading: "Uploaden...",
  "removing-bg": "Achtergrond verwijderen...",
  generating: "Scène genereren...",
  done: "Klaar!",
  error: "Er ging iets mis",
};

const STAGE_PROGRESS: Record<Stage, number> = {
  idle: 0,
  uploading: 20,
  "removing-bg": 50,
  generating: 80,
  done: 100,
  error: 0,
};

// Preset scenes for Phase 1 (15 in Phase 2)
const SCENE_THEMES = [
  { id: "marble-counter", label: "Marmeren aanrechtblad", prompt: "product on a clean marble kitchen countertop, soft natural light, professional product photography" },
  { id: "minimalist-studio", label: "Minimalistisch studio", prompt: "product on a minimalist white studio background, soft box lighting, professional e-commerce photography" },
  { id: "wooden-shelf", label: "Houten plank", prompt: "product on a rustic wooden shelf, warm ambient light, lifestyle product photography" },
  { id: "outdoor-garden", label: "Buitentuin", prompt: "product in a lush outdoor garden setting, natural daylight, lifestyle photography" },
  { id: "flat-lay", label: "Flat lay", prompt: "product in a flat lay arrangement on a neutral linen surface, top-down view, clean minimal styling" },
];

export default function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [imageId, setImageId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(SCENE_THEMES[0]);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Upload een afbeelding (JPG, PNG, WEBP)");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Bestand is te groot (max 20MB)");
        return;
      }

      try {
        setStage("uploading");

        // 1. Get presigned upload URL
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, filename: file.name }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Upload mislukt");
        }

        const { uploadUrl, imageId: id } = await res.json();
        setImageId(id);

        // 2. Upload directly to R2
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // 3. Start pipeline job
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

        if (!jobRes.ok) throw new Error("Verwerking starten mislukt");

        // 4. Poll for completion
        setStage("generating");
        pollStatus(id);
      } catch (err) {
        setStage("error");
        toast.error(err instanceof Error ? err.message : "Onbekende fout");
      }
    },
    [selectedTheme]
  );

  async function pollStatus(id: string) {
    const TIMEOUT_MS = 3 * 60 * 1000;
    const startedAt = Date.now();

    const poll = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        clearInterval(poll);
        setStage("error");
        toast.error("Verwerking duurt te lang. Probeer opnieuw.");
        return;
      }

      const res = await fetch(`/api/jobs?imageId=${id}`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.status === "REMOVING_BG") {
        setStage("removing-bg");
      } else if (data.status === "GENERATING" || data.status === "UPSCALING") {
        setStage("generating");
      } else if (data.status === "DONE") {
        clearInterval(poll);
        setPreviewUrls(data.previewUrls ?? []);
        setStage("done");
        toast.success("Foto's zijn klaar!");
      } else if (data.status === "FAILED") {
        clearInterval(poll);
        setStage("error");
        toast.error("Genereren mislukt. Probeer opnieuw.");
      }
    }, 2000);
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fotograph</h1>
          <p className="text-gray-500 text-sm mt-1">
            AI productfotografie voor Bol.com &amp; webshops
          </p>
        </div>

        {/* Scene theme selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kies een scène</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {SCENE_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedTheme.id === theme.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                }`}
              >
                {theme.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Upload area */}
        <Card>
          <CardContent className="pt-6">
            {stage === "idle" ? (
              <label
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  dragOver
                    ? "border-gray-900 bg-gray-100"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="text-center pointer-events-none">
                  <p className="text-gray-600 font-medium">
                    Sleep een foto hierheen
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    of klik om te bladeren · JPG, PNG, WEBP · max 20MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onInputChange}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {STAGE_LABELS[stage]}
                  </span>
                  <Badge variant={stage === "done" ? "default" : stage === "error" ? "destructive" : "secondary"}>
                    {stage}
                  </Badge>
                </div>
                {stage !== "error" && (
                  <Progress value={STAGE_PROGRESS[stage]} className="h-2" />
                )}
                {stage === "error" && (
                  <Button variant="outline" onClick={() => setStage("idle")}>
                    Opnieuw proberen
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {previewUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gegenereerde foto&apos;s</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <a
                    href={url}
                    download
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  >
                    <span className="text-white text-sm font-medium">
                      Downloaden
                    </span>
                  </a>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
