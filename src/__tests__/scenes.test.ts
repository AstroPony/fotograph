import { describe, it, expect } from "vitest";
import {
  SCENE_THEMES,
  SCENE_MAP,
  PLATFORMS,
  PLATFORM_COLORS,
  LEGACY_SCENE_IDS,
} from "@/lib/scenes";

describe("SCENE_THEMES shape", () => {
  it("has 6 scenes", () => {
    expect(SCENE_THEMES).toHaveLength(6);
  });

  it("every scene has required fields with correct types", () => {
    for (const scene of SCENE_THEMES) {
      expect(typeof scene.id).toBe("string");
      expect(typeof scene.label).toBe("string");
      expect(scene.gradient).toHaveLength(2);
      expect(typeof scene.generated).toBe("boolean");
      expect(typeof scene.bgColor.r).toBe("number");
      expect(typeof scene.bgColor.g).toBe("number");
      expect(typeof scene.bgColor.b).toBe("number");
      expect(typeof scene.prompt).toBe("string");
    }
  });

  it("solid scenes (generated: false) have empty prompt", () => {
    for (const scene of SCENE_THEMES.filter((s) => !s.generated)) {
      expect(scene.prompt).toBe("");
    }
  });

  it("generated scenes have a non-trivial prompt", () => {
    for (const scene of SCENE_THEMES.filter((s) => s.generated)) {
      expect(scene.prompt.length).toBeGreaterThan(20);
    }
  });

  it("bgColor channels are in 0–255 range", () => {
    for (const scene of SCENE_THEMES) {
      expect(scene.bgColor.r).toBeGreaterThanOrEqual(0);
      expect(scene.bgColor.r).toBeLessThanOrEqual(255);
      expect(scene.bgColor.g).toBeGreaterThanOrEqual(0);
      expect(scene.bgColor.g).toBeLessThanOrEqual(255);
      expect(scene.bgColor.b).toBeGreaterThanOrEqual(0);
      expect(scene.bgColor.b).toBeLessThanOrEqual(255);
    }
  });

  it("scene IDs are unique", () => {
    const ids = SCENE_THEMES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SCENE_MAP", () => {
  it("contains every SCENE_THEMES entry by id", () => {
    for (const scene of SCENE_THEMES) {
      expect(SCENE_MAP[scene.id]).toBe(scene);
    }
  });

  it("has no extra keys beyond SCENE_THEMES", () => {
    const ids = new Set(SCENE_THEMES.map((s) => s.id));
    for (const key of Object.keys(SCENE_MAP)) {
      expect(ids.has(key)).toBe(true);
    }
  });
});

describe("PLATFORMS", () => {
  it("covers 5 platforms", () => {
    expect(PLATFORMS).toHaveLength(5);
  });

  it("every platform scene reference resolves in SCENE_MAP", () => {
    for (const platform of PLATFORMS) {
      for (const sceneId of platform.scenes) {
        expect(
          SCENE_MAP[sceneId],
          `platform "${platform.id}" references unknown scene "${sceneId}"`
        ).toBeDefined();
      }
    }
  });

  it("every platform has a hex colour in PLATFORM_COLORS", () => {
    for (const platform of PLATFORMS) {
      const color = PLATFORM_COLORS[platform.id];
      expect(color, `missing color for platform "${platform.id}"`).toBeDefined();
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("LEGACY_SCENE_IDS", () => {
  it("every legacy value resolves to a current scene in SCENE_MAP", () => {
    for (const [oldId, newId] of Object.entries(LEGACY_SCENE_IDS)) {
      expect(
        SCENE_MAP[newId],
        `legacy "${oldId}" maps to unknown scene "${newId}"`
      ).toBeDefined();
    }
  });

  it("no legacy key is also a current scene ID (would be a no-op remap)", () => {
    for (const oldId of Object.keys(LEGACY_SCENE_IDS)) {
      expect(
        SCENE_MAP[oldId],
        `"${oldId}" exists in both LEGACY_SCENE_IDS and SCENE_MAP`
      ).toBeUndefined();
    }
  });
});
