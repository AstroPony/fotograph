import { describe, it, expect } from "vitest";
import { ALLOWED_MIME_TYPES } from "../route";

describe("upload MIME type validation", () => {
  it("allows jpeg", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/jpeg")).toBe(true);
  });

  it("allows png", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/png")).toBe(true);
  });

  it("allows webp", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/webp")).toBe(true);
  });

  it("allows heic (iPhone photos)", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/heic")).toBe(true);
  });

  it("rejects pdf", () => {
    expect(ALLOWED_MIME_TYPES.includes("application/pdf" as never)).toBe(false);
  });

  it("rejects svg (XSS risk)", () => {
    expect(ALLOWED_MIME_TYPES.includes("image/svg+xml" as never)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(ALLOWED_MIME_TYPES.includes("" as never)).toBe(false);
  });
});
