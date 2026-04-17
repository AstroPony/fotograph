export const SCENE_THEMES = [
  { id: "marble-counter", label: "Marmeren aanrechtblad", prompt: "product on a clean marble kitchen countertop, soft natural light, professional product photography" },
  { id: "minimalist-studio", label: "Minimalistisch studio", prompt: "product on a minimalist white studio background, soft box lighting, professional e-commerce photography" },
  { id: "wooden-shelf", label: "Houten plank", prompt: "product on a rustic wooden shelf, warm ambient light, lifestyle product photography" },
  { id: "outdoor-garden", label: "Buitentuin", prompt: "product in a lush outdoor garden setting, natural daylight, lifestyle photography" },
  { id: "flat-lay", label: "Flat lay", prompt: "product in a flat lay arrangement on a neutral linen surface, top-down view, clean minimal styling" },
] as const;

export type SceneThemeId = typeof SCENE_THEMES[number]["id"];

export const SCENE_LABELS: Record<string, string> = Object.fromEntries(
  SCENE_THEMES.map((t) => [t.id, t.label])
);

export const IMAGE_STATUS_LABELS: Record<string, string> = {
  PENDING: "In wachtrij",
  REMOVING_BG: "Achtergrond",
  GENERATING: "Genereren",
  UPSCALING: "Upscalen",
  DONE: "Klaar",
  FAILED: "Mislukt",
};
