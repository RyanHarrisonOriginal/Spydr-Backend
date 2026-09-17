import { describe, expect, it } from "vitest";
import { normalizeEmoji } from "./emoji.js";

describe("normalizeEmoji", () => {
  it("returns null for empty values", () => {
    expect(normalizeEmoji(null)).toBeNull();
    expect(normalizeEmoji(undefined)).toBeNull();
    expect(normalizeEmoji("")).toBeNull();
    expect(normalizeEmoji("   ")).toBeNull();
  });

  it("accepts a single emoji grapheme", () => {
    expect(normalizeEmoji("🚀")).toBe("🚀");
    expect(normalizeEmoji(" 🧠 ")).toBe("🧠");
    expect(normalizeEmoji("👨‍💻")).toBe("👨‍💻");
  });

  it("rejects multiple graphemes or whitespace inside the value", () => {
    expect(() => normalizeEmoji("🚀🚀")).toThrow("Invalid emoji");
    expect(() => normalizeEmoji("rocket")).toThrow("Invalid emoji");
  });
});
