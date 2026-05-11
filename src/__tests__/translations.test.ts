import { describe, it, expect } from "vitest";
import { translations } from "@/lib/translations";
import { SCENE_THEMES, PLATFORMS } from "@/lib/scenes";

describe("translation key completeness", () => {
  it("NL and EN have identical key sets", () => {
    const nlKeys = Object.keys(translations.nl).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(nlKeys).toEqual(enKeys);
  });

  it("no translation value is blank", () => {
    for (const [key, value] of Object.entries(translations.nl)) {
      expect(value.trim().length, `NL key "${key}" is empty`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(translations.en)) {
      expect(value.trim().length, `EN key "${key}" is empty`).toBeGreaterThan(0);
    }
  });

  it("every scene ID has scene_<id> in both languages", () => {
    for (const scene of SCENE_THEMES) {
      const key = `scene_${scene.id}`;
      expect(
        translations.nl,
        `NL missing "${key}" for scene "${scene.id}"`
      ).toHaveProperty(key);
      expect(
        translations.en,
        `EN missing "${key}" for scene "${scene.id}"`
      ).toHaveProperty(key);
    }
  });

  it("every platform ID has platform_<id> and platform_<id>_desc in both languages", () => {
    for (const platform of PLATFORMS) {
      const labelKey = `platform_${platform.id}`;
      const descKey  = `platform_${platform.id}_desc`;

      expect(translations.nl, `NL missing "${labelKey}"`).toHaveProperty(labelKey);
      expect(translations.nl, `NL missing "${descKey}"`).toHaveProperty(descKey);
      expect(translations.en, `EN missing "${labelKey}"`).toHaveProperty(labelKey);
      expect(translations.en, `EN missing "${descKey}"`).toHaveProperty(descKey);
    }
  });
});
