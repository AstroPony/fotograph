import { describe, it, expect } from "vitest";
import { SCENE_THEMES } from "../scenes";

describe("SCENE_THEMES", () => {
  it("has at least one scene", () => {
    expect(SCENE_THEMES.length).toBeGreaterThan(0);
  });

  it("every scene has id, label, and gradient", () => {
    for (const theme of SCENE_THEMES) {
      expect(theme.id, `scene missing id`).toBeTruthy();
      expect(theme.label, `${theme.id} missing label`).toBeTruthy();
      expect(Array.isArray(theme.gradient), `${theme.id} gradient not array`).toBe(true);
    }
  });

  it("every scene has exactly 2 gradient colours", () => {
    for (const theme of SCENE_THEMES) {
      expect(theme.gradient.length, `${theme.id} gradient length`).toBe(2);
    }
  });

  it("all scene IDs are unique", () => {
    const ids = SCENE_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all scene IDs are kebab-case with no spaces", () => {
    for (const theme of SCENE_THEMES) {
      expect(theme.id, `${theme.id} has spaces`).not.toContain(" ");
    }
  });

  it("solid scenes (generated: false) have empty prompt", () => {
    for (const theme of SCENE_THEMES.filter((t) => !t.generated)) {
      expect(theme.prompt, `${theme.id} solid scene should have empty prompt`).toBe("");
    }
  });

  it("generated scenes have a meaningful prompt within API limits", () => {
    for (const theme of SCENE_THEMES.filter((t) => t.generated)) {
      expect(theme.prompt.length, `${theme.id} prompt too short`).toBeGreaterThan(20);
      // Leave room for user's custom text (200 chars) on top of the scene prompt
      expect(theme.prompt.length, `${theme.id} prompt too long`).toBeLessThan(800);
    }
  });
});
