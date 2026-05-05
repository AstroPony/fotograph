export const SCENE_THEMES = [
  {
    id: "editorial-marble",
    label: "Marmeren plint",
    gradient: ["#dedad6", "#b0aca8"] as [string, string],
    prompt: "Polished Carrara marble surface with fine grey veining extending across the foreground, the center of the surface is completely bare and empty, a folded ivory linen napkin draped to the far right edge, a single sprig of fresh rosemary resting at the back-left corner of the stone, soft cold window light from the upper left fading into gentle shadow on the right, editorial product photography, magazine quality.",
  },
  {
    id: "minimal-studio",
    label: "Witte studio",
    gradient: ["#f2ede6", "#d4cfc8"] as [string, string],
    prompt: "Seamless soft-ecru paper backdrop curving gently from floor to wall, matte surface with a smooth gradient of light, the center foreground surface is completely bare and unoccupied, a subtle soft cast shadow to the lower-right corner, warm white and pale sand colour palette, diffused studio softbox from the upper left with a subtle fill bounce on the right, commercial catalogue photography.",
  },
  {
    id: "warm-oak-kitchen",
    label: "Eiken keuken",
    gradient: ["#c8a070", "#8c6030"] as [string, string],
    prompt: "Weathered light-oak kitchen counter with visible grain and soft knife marks, the center of the counter surface is completely empty and bare, a folded natural linen tea towel pooled at the far right edge, a wooden spoon and a small handful of sea salt scattered at the back-left corner, warm morning sunlight raking from a window on the left, out-of-focus cream tile wall in the far background, lifestyle food photography, Kinfolk editorial, shallow depth of field.",
  },
  {
    id: "scandi-morning",
    label: "Scandinavisch interieur",
    gradient: ["#e8e4dc", "#c0bdb4"] as [string, string],
    prompt: "Pale whitewashed pine plank surface, the center foreground area is bare and empty with nothing on it, a crumpled oat-coloured linen runner folded loosely at the far right, a tiny ceramic bud vase with a single sprig of eucalyptus tucked in the back-left corner, a thick knitted wool throw draped on the far background edge out of focus, soft overcast Nordic daylight from a large window, cool neutral colour temperature with faint blue in the shadows, quiet matte highlights, slow lifestyle photography, Scandinavian hygge editorial, muted tones.",
  },
  {
    id: "botanical-greenhouse",
    label: "Botanische kas",
    gradient: ["#b06840", "#3a7848"] as [string, string],
    prompt: "Aged terracotta tile surface with a light mineral patina, the center foreground is clean and completely bare, lush out-of-focus tropical monstera and fern foliage filling the background left and right edges in soft green bokeh, a few fallen leaves resting near the back corners only, bright diffused daylight filtering through a glass greenhouse roof from above, warm earthy colour grading with vibrant greens, botanical lifestyle photography, crisp dewy detail, shallow depth of field.",
  },
  {
    id: "moody-industrial",
    label: "Industrieel donker",
    gradient: ["#3c3838", "#181818"] as [string, string],
    prompt: "Dark matte concrete surface with subtle mineral flecks and a faint crack, the center foreground area is completely bare and empty, a rough slate tile leaning against a distant blurred charcoal wall far in the background, dramatic low-key rim light from the upper right sculpting the scene, deep moody shadows on the left, slate and graphite colour palette, high-end commercial product photography, noir editorial, sharp specular highlights, cinematic contrast.",
  },
  {
    id: "golden-hour-lifestyle",
    label: "Gouden uur terras",
    gradient: ["#f0a030", "#b86010"] as [string, string],
    prompt: "Sun-warmed rustic wooden café table on an outdoor terrace, the center surface of the table is empty and unoccupied, a folded newspaper resting at the far left edge of the table, a ceramic espresso cup on a saucer placed to the far right, a wicker chair partially visible and out of focus in the background, soft golden hour sunlight streaming in almost horizontally from the right, long warm shadows stretching across the wood grain, backlit highlights glowing amber, faint street bokeh far in the distance, candid lifestyle photography, warm analog film look, shallow depth of field.",
  },
  {
    id: "sunlit-coastal",
    label: "Kust & zon",
    gradient: ["#d8ccb0", "#70acc0"] as [string, string],
    prompt: "Pale travertine stone slab with a flat surface, the center foreground is completely bare and empty, a weathered piece of driftwood resting at the far left edge, a dried starfish placed in the back-right corner, shallow Mediterranean sea foam blurred on the horizon, hazy golden mid-morning sun from the right casting long soft shadows, warm salt-air atmosphere, summer lifestyle photography, Condé Nast Traveller aesthetic, gentle film grain, warm highlights.",
  },
  {
    id: "winter-cosy",
    label: "Winterse sfeer",
    gradient: ["#ece0cc", "#c84e18"] as [string, string],
    prompt: "Soft cream chunky knit wool blanket as the base surface with visible cable texture, the center of the surface is bare and empty with nothing resting on it, a sprig of dried cotton stems placed at the back-left corner, a small pinecone resting at the far right edge, a blurred warm fireplace glow in the deep background casting amber highlights, a few fallen fir needles scattered near the back corners, gentle soft evening firelight from the lower right with warm orange colour temperature, cosy low-contrast atmosphere, winter lifestyle editorial, holiday catalogue photography, warm tones, shallow depth of field.",
  },
  {
    id: "sleek-tech",
    label: "Tech & elektronica",
    gradient: ["#28283a", "#0c0c16"] as [string, string],
    prompt: "Smooth dark anthracite acrylic surface with a soft mirror reflection fading into shadow, clean graduated backdrop shifting from deep graphite at the bottom to a cool dark blue at the top, the center foreground surface is completely bare and empty, subtle coloured rim lighting from the upper right edge, crisp specular highlights, high-end tech product photography, clean commercial studio, razor-sharp focus.",
  },
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
