export const SCENE_THEMES = [
  {
    id: "editorial-marble",
    label: "Marmeren plint",
    gradient: ["#dedad6", "#b0aca8"] as [string, string],
    prompt: "Close-up straight-on product photography view of polished Carrara marble with fine grey veining, flat even surface parallel to the camera, the entire lower two-thirds of the frame is bare clean marble with absolutely nothing on it, a single small folded ivory linen cloth placed only at the very top edge in the far background, soft cold light from the upper left, editorial magazine photography.",
  },
  {
    id: "minimal-studio",
    label: "Witte studio",
    gradient: ["#f2ede6", "#d4cfc8"] as [string, string],
    prompt: "Close-up straight-on product photography view of a seamless soft-ecru paper sweep, matte surface flat and parallel to the camera, the lower two-thirds of the frame is bare clean surface with nothing on it, smooth gradient from pale ecru at the bottom to soft white in the background, diffused softbox light from the upper left, commercial catalogue photography.",
  },
  {
    id: "warm-oak-kitchen",
    label: "Eiken keuken",
    gradient: ["#c8a070", "#8c6030"] as [string, string],
    prompt: "Close-up straight-on product photography view of a weathered light-oak wooden surface with visible grain, flat even plane parallel to the camera, the lower two-thirds of the frame is bare empty wood with nothing on it, blurred warm kitchen background with cream tones visible only at the very top of the frame, soft warm morning light from the left, lifestyle photography.",
  },
  {
    id: "scandi-morning",
    label: "Scandinavisch interieur",
    gradient: ["#e8e4dc", "#c0bdb4"] as [string, string],
    prompt: "Close-up straight-on product photography view of a pale whitewashed pine plank surface, flat even plane parallel to the camera, the lower two-thirds of the frame is bare empty surface with nothing on it, a single dried eucalyptus sprig only at the very top-left corner of the background, soft overcast daylight from the left, muted Nordic tones, Scandinavian lifestyle photography.",
  },
  {
    id: "botanical-greenhouse",
    label: "Botanische kas",
    gradient: ["#b06840", "#3a7848"] as [string, string],
    prompt: "Close-up straight-on product photography view of an aged terracotta tile surface with light mineral patina, flat even plane parallel to the camera, the lower two-thirds of the frame is bare clean tile with nothing on it, out-of-focus lush tropical green foliage visible only at the very top of the frame, bright overhead daylight, warm earthy tones, botanical photography.",
  },
  {
    id: "moody-industrial",
    label: "Industrieel donker",
    gradient: ["#3c3838", "#181818"] as [string, string],
    prompt: "Close-up straight-on product photography view of dark matte concrete with subtle mineral texture, flat even surface parallel to the camera, the lower two-thirds of the frame is bare empty concrete with nothing on it, a blurred deep charcoal background visible only in the upper quarter, directional light from the upper right, cinematic contrast, high-end commercial photography.",
  },
  {
    id: "golden-hour-lifestyle",
    label: "Gouden uur terras",
    gradient: ["#f0a030", "#b86010"] as [string, string],
    prompt: "Close-up straight-on product photography view of a sun-warmed weathered wooden surface with natural grain, flat even plane parallel to the camera, the lower two-thirds of the frame is bare empty wood with nothing on it, warm golden afternoon light from the right, blurred warm amber background visible only at the very top of the frame, lifestyle photography, warm analog film look.",
  },
  {
    id: "sunlit-coastal",
    label: "Kust & zon",
    gradient: ["#d8ccb0", "#70acc0"] as [string, string],
    prompt: "Close-up straight-on product photography view of a pale travertine stone surface, flat even plane parallel to the camera, the lower two-thirds of the frame is bare clean stone with nothing on it, blurred coastal blue sea and hazy sky visible only at the very top of the frame, warm morning sun from the right, coastal lifestyle photography.",
  },
  {
    id: "winter-cosy",
    label: "Winterse sfeer",
    gradient: ["#ece0cc", "#c84e18"] as [string, string],
    prompt: "Close-up straight-on product photography view of a soft cream chunky knit wool surface with visible cable texture, flat even plane parallel to the camera, the lower two-thirds of the frame is bare empty textile with nothing resting on it, blurred warm amber fireplace glow visible only in the far upper background, soft warm side light from the right, cosy holiday photography.",
  },
  {
    id: "sleek-tech",
    label: "Tech & elektronica",
    gradient: ["#28283a", "#0c0c16"] as [string, string],
    prompt: "Close-up straight-on product photography view of a smooth dark anthracite acrylic surface with a faint mirror reflection, flat even surface parallel to the camera, the lower two-thirds of the frame is bare empty surface with nothing on it, dark graduated backdrop from deep charcoal at the bottom to dark blue at the top visible behind, even side light from the upper right, high-end tech product photography.",
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
