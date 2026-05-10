export type SceneBgColor = { r: number; g: number; b: number };

export const SCENE_THEMES = [
  // ── Solid colour backgrounds ─────────────────────────────────────────────
  // Pipeline creates these with Sharp only — zero AI credits.
  {
    id: "white-seamless",
    label: "Witte achtergrond",
    gradient: ["#f8f8f8", "#e0e0e0"] as [string, string],
    generated: false as const,
    bgColor: { r: 255, g: 255, b: 255 } as SceneBgColor,
    prompt: "",
  },
  {
    id: "soft-shadow",
    label: "Zachte schaduw",
    gradient: ["#f0f0f0", "#d8d8d8"] as [string, string],
    generated: false as const,
    bgColor: { r: 255, g: 255, b: 255 } as SceneBgColor,
    prompt: "",
  },
  {
    id: "light-gray",
    label: "Licht grijs",
    gradient: ["#e8e8e8", "#c8c8c8"] as [string, string],
    generated: false as const,
    bgColor: { r: 220, g: 220, b: 220 } as SceneBgColor,
    prompt: "",
  },
  // ── AI-generated simple backgrounds ──────────────────────────────────────
  // Pipeline calls FLUX Schnell (text-to-image) then composites the product.
  {
    id: "marble-white",
    label: "Wit marmer",
    gradient: ["#dedad6", "#b0aca8"] as [string, string],
    generated: true as const,
    bgColor: { r: 240, g: 238, b: 235 } as SceneBgColor,
    prompt: "White Carrara marble surface, seamless studio background, overhead softbox lighting, clean empty surface, no objects, no people",
  },
  {
    id: "light-wood",
    label: "Licht hout",
    gradient: ["#c8a070", "#8c6030"] as [string, string],
    generated: true as const,
    bgColor: { r: 200, g: 160, b: 112 } as SceneBgColor,
    prompt: "Light oak wooden table surface, soft natural daylight from the left, clean empty surface, product photography, no objects, no people",
  },
  {
    id: "dark-concrete",
    label: "Donker beton",
    gradient: ["#3c3838", "#181818"] as [string, string],
    generated: true as const,
    bgColor: { r: 60, g: 56, b: 56 } as SceneBgColor,
    prompt: "Dark matte concrete surface, directional side lighting, clean empty surface, high-end product photography, no objects, no people",
  },
] as const;

export type SceneThemeId = typeof SCENE_THEMES[number]["id"];
export type SceneTheme   = typeof SCENE_THEMES[number];

export const SCENE_MAP: Record<string, SceneTheme> = Object.fromEntries(
  SCENE_THEMES.map((t) => [t.id, t])
);

export const SCENE_LABELS: Record<string, string> = Object.fromEntries(
  SCENE_THEMES.map((t) => [t.id, t.label])
);

export const IMAGE_STATUS_LABELS: Record<string, string> = {
  PENDING:      "In wachtrij",
  REMOVING_BG:  "Achtergrond",
  GENERATING:   "Genereren",
  UPSCALING:    "Upscalen",
  DONE:         "Klaar",
  FAILED:       "Mislukt",
};

export type PlatformId = "bol" | "shopify" | "woocommerce" | "amazon" | "etsy";

export const PLATFORMS: ReadonlyArray<{
  id: PlatformId;
  scenes: ReadonlyArray<SceneThemeId>;
}> = [
  { id: "bol",         scenes: ["white-seamless", "soft-shadow", "light-gray"] },
  { id: "shopify",     scenes: ["white-seamless", "soft-shadow", "light-gray", "marble-white", "light-wood", "dark-concrete"] },
  { id: "woocommerce", scenes: ["white-seamless", "light-gray", "marble-white", "light-wood"] },
  { id: "amazon",      scenes: ["white-seamless", "soft-shadow", "light-gray"] },
  { id: "etsy",        scenes: ["marble-white", "light-wood", "soft-shadow"] },
] as const;

export const PLATFORM_COLORS: Record<PlatformId, string> = {
  bol:         "#FF6B2B",
  shopify:     "#96BF48",
  woocommerce: "#7F54B3",
  amazon:      "#FF9900",
  etsy:        "#F1641E",
};
