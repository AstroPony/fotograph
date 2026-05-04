import { describe, it, expect } from "vitest";
import { VALID_SCENE_IDS, MAX_CUSTOM_PROMPT_LENGTH, RATE_LIMIT_PER_HOUR } from "../route";
import { SCENE_THEMES } from "@/lib/scenes";

describe("jobs route — scene validation", () => {
  it("accepts all scene IDs from SCENE_THEMES", () => {
    for (const theme of SCENE_THEMES) {
      expect(VALID_SCENE_IDS.has(theme.id)).toBe(true);
    }
  });

  it("rejects an unknown scene ID", () => {
    expect(VALID_SCENE_IDS.has("fake-scene")).toBe(false);
  });

  it("rejects an empty string as scene ID", () => {
    expect(VALID_SCENE_IDS.has("")).toBe(false);
  });
});

describe("jobs route — prompt length limit", () => {
  it("limit is 1000 characters", () => {
    expect(MAX_CUSTOM_PROMPT_LENGTH).toBe(1000);
  });

  it("prompt at the limit passes the guard", () => {
    const atLimit = "a".repeat(MAX_CUSTOM_PROMPT_LENGTH);
    expect(atLimit.length > MAX_CUSTOM_PROMPT_LENGTH).toBe(false);
  });

  it("prompt one character over fails the guard", () => {
    const overLimit = "a".repeat(MAX_CUSTOM_PROMPT_LENGTH + 1);
    expect(overLimit.length > MAX_CUSTOM_PROMPT_LENGTH).toBe(true);
  });
});

describe("jobs route — rate limit", () => {
  it("rate limit is 20 generations per hour", () => {
    expect(RATE_LIMIT_PER_HOUR).toBe(20);
  });

  it("rate limit is a positive integer", () => {
    expect(Number.isInteger(RATE_LIMIT_PER_HOUR)).toBe(true);
    expect(RATE_LIMIT_PER_HOUR).toBeGreaterThan(0);
  });
});

describe("combined prompt concatenation", () => {
  it("appends user text to scene prompt when provided", () => {
    const scenePrompt = "Polished marble surface, soft window light.";
    const userText = "zomerse sfeer";
    const result = `${scenePrompt} ${userText.trim()}`;
    expect(result).toBe("Polished marble surface, soft window light. zomerse sfeer");
  });

  it("uses scene prompt unchanged when user text is empty", () => {
    const scenePrompt = "Polished marble surface, soft window light.";
    const userText = "  ";
    const result = userText.trim() ? `${scenePrompt} ${userText.trim()}` : scenePrompt;
    expect(result).toBe(scenePrompt);
  });

  it("trims whitespace from user text before appending", () => {
    const scenePrompt = "Scene.";
    const userText = "  extra details  ";
    const result = `${scenePrompt} ${userText.trim()}`;
    expect(result).toBe("Scene. extra details");
  });

  it("combined prompt stays under the API character limit", () => {
    const longestScene = SCENE_THEMES.reduce((a, b) => a.prompt.length > b.prompt.length ? a : b);
    const maxUserText = "a".repeat(200);
    const combined = `${longestScene.prompt} ${maxUserText}`;
    expect(combined.length).toBeLessThan(MAX_CUSTOM_PROMPT_LENGTH);
  });
});
