export const SCENE_THEMES = [
  {
    id: "editorial-marble",
    label: "Marmeren plint",
    prompt: "Polished Carrara marble slab with fine grey veining, a folded ivory linen napkin draped to one side, a single sprig of fresh rosemary resting on the stone, soft cold window light from the upper left fading into gentle shadow on the right, faint dust motes suspended in the beam, shot on medium format 80mm at f/4, editorial product photography, magazine cover quality, crisp foreground focus, subtle natural grain.",
  },
  {
    id: "minimal-studio",
    label: "Witte studio",
    prompt: "Seamless soft-ecru paper backdrop curving gently from floor to wall with no visible seam, matte surface catching a smooth gradient of light, a single cast shadow falling to the lower right with a soft penumbra, no props, colour palette limited to warm white and pale sand, diffused studio softbox from the upper left with a subtle fill bounce on the right, shot on medium format 100mm at f/8, commercial catalogue photography, clean composition, razor-sharp focus.",
  },
  {
    id: "warm-oak-kitchen",
    label: "Eiken keuken",
    prompt: "Weathered light-oak kitchen counter with visible grain and a few soft knife marks, a folded natural linen tea towel pooled behind, a wooden spoon and a small handful of sea salt scattered to the right, warm morning sunlight raking from a window on the left, lazy steam and dust catching the beam, out-of-focus cream tile wall in the far background, shot on full frame 50mm at f/2.8, lifestyle food photography, Kinfolk editorial, shallow depth of field.",
  },
  {
    id: "scandi-morning",
    label: "Scandinavisch interieur",
    prompt: "Pale whitewashed pine plank surface, a crumpled oat-coloured linen runner folded loosely, a tiny ceramic bud vase with a single sprig of eucalyptus to the back left, a thick knitted wool throw draped on the far edge out of focus, soft overcast Nordic daylight from a large window directly ahead, cool neutral colour temperature with the faintest hint of blue in the shadows, quiet matte highlights, shot on full frame 50mm at f/2.2, slow lifestyle photography, Scandinavian hygge editorial, muted tones, shallow depth of field.",
  },
  {
    id: "botanical-greenhouse",
    label: "Botanische kas",
    prompt: "Aged terracotta tile surface with a light patina of mineral residue, lush out-of-focus tropical monstera and fern foliage filling the background in soft green bokeh, a few fallen leaves resting around the centre, tiny water droplets scattered across the tile catching the light, bright diffused daylight filtering through a glass greenhouse roof from above, humid atmosphere with faint mist in the air, warm earthy colour grading with vibrant greens, shot on full frame 60mm macro at f/3.2, botanical lifestyle photography, crisp dewy detail, shallow depth of field.",
  },
  {
    id: "moody-industrial",
    label: "Industrieel donker",
    prompt: "Dark wet-look matte concrete plinth with subtle mineral flecks and a faint crack running across the surface, a single rough slate tile leaning against a distant blurred charcoal wall, a wisp of low cool mist drifting across the base, dramatic low-key rim light from the upper right sculpting the edge of the scene, deep moody shadows on the left, restrained colour palette of slate, graphite and deep teal, shot on full frame 85mm at f/2.8, high-end commercial product photography, noir editorial, sharp specular highlights, cinematic contrast.",
  },
  {
    id: "golden-hour-lifestyle",
    label: "Gouden uur terras",
    prompt: "Sun-warmed rustic wooden café table on an outdoor terrace, a folded newspaper and a ceramic espresso cup on a saucer resting casually to the side, a wicker chair partially visible and out of focus in the background, soft golden hour sunlight streaming in almost horizontally from the right, long warm shadows stretching across the grain of the wood, backlit highlights glowing amber, faint street bokeh far in the distance, shot on full frame 35mm at f/1.8, candid lifestyle photography, warm analog film look, light lens flare in the corner, shallow depth of field.",
  },
  {
    id: "sunlit-coastal",
    label: "Kust & zon",
    prompt: "Pale travertine stone ledge dusted with fine sand, a weathered piece of driftwood resting diagonally in the middle distance, a single dried starfish and a pale shell to the side, shallow Mediterranean sea foam blurred on the horizon, hazy golden mid-morning sun from the right casting long soft shadows, warm salt-air atmosphere with faint sea spray in the light, shot on full frame 35mm at f/3.5, summer lifestyle photography, Condé Nast Traveller aesthetic, gentle film grain, warm highlights.",
  },
  {
    id: "winter-cosy",
    label: "Winterse sfeer",
    prompt: "Soft cream chunky knit wool blanket as the base surface with visible chunky cable texture, a sprig of dried cotton stems and a small pinecone resting to the upper left, a blurred warm fireplace glow in the deep background casting amber highlights, a few fallen fir needles around the centre, gentle soft evening firelight from the lower right with warm orange tungsten colour temperature, cosy low-contrast atmosphere, faint wood-smoke haze in the air, shot on full frame 50mm at f/2.0, winter lifestyle editorial, holiday catalogue photography, warm tones, shallow depth of field.",
  },
  {
    id: "sleek-tech",
    label: "Tech & elektronica",
    prompt: "Smooth dark anthracite acrylic surface with a soft mirror reflection fading into shadow, a clean graduated backdrop shifting from deep graphite at the bottom to a cool electric-blue glow at the top, subtle coloured gel rim lighting from the upper right edge, a faint pool of cyan caustic light on the surface, minimal floating dust particles in the beam, crisp specular highlights, no props, shot on medium format 100mm at f/8, high-end tech product photography, Apple-keynote aesthetic, ultra-clean commercial render, razor-sharp focus.",
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
