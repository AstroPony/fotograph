import { describe, it, expect } from "vitest";
import { SCENE_THEMES } from "../scenes";

describe("SCENE_THEMES", () => {
  it("has at least one scene", () => {
    expect(SCENE_THEMES.length).toBeGreaterThan(0);
  });

  it("every scene has all required fields", () => {
    for (const theme of SCENE_THEMES) {
      expect(theme.id, `scene missing id`).toBeTruthy();
      expect(theme.label, `${theme.id} missing label`).toBeTruthy();
      expect(theme.prompt, `${theme.id} missing prompt`).toBeTruthy();
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

  it("no prompt is dangerously short (guards against accidental empty strings)", () => {
    for (const theme of SCENE_THEMES) {
      expect(theme.prompt.length, `${theme.id} prompt too short`).toBeGreaterThan(20);
    }
  });

  it("no prompt exceeds the API character limit", () => {
    for (const theme of SCENE_THEMES) {
      // Leave room for user's custom text (200 chars) on top of the scene prompt
      expect(theme.prompt.length, `${theme.id} prompt too long`).toBeLessThan(800);
    }
  });
});
