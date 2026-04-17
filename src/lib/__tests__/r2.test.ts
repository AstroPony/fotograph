import { describe, it, expect, beforeEach } from "vitest";

describe("getPublicUrl", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://cdn.example.com";
  });

  it("constructs a public URL from a key", async () => {
    const { getPublicUrl } = await import("../r2");
    expect(getPublicUrl("previews/abc/image.jpg")).toBe(
      "https://cdn.example.com/previews/abc/image.jpg"
    );
  });

  it("handles keys without a leading slash", async () => {
    const { getPublicUrl } = await import("../r2");
    expect(getPublicUrl("uploads/user-id/file.png")).toBe(
      "https://cdn.example.com/uploads/user-id/file.png"
    );
  });
});
