import { describe, expect, it } from "vitest";
import { defaultGiftPollCopy, isSafeProductUrl, normalizeBudgetAmount, normalizeGiftPollMode } from "./validation";

describe("gift poll validation", () => {
  it("keeps the two supported poll modes", () => {
    expect(normalizeGiftPollMode("gift")).toBe("gift");
    expect(normalizeGiftPollMode("budget")).toBe("budget");
    expect(normalizeGiftPollMode("anything-else")).toBe("gift");
  });

  it("uses clear defaults for gift and budget decisions", () => {
    expect(defaultGiftPollCopy("gift", "Ирина").question).toContain("Ирина");
    expect(defaultGiftPollCopy("budget", "Ирина").title).toContain("бюджет");
  });

  it("allows only HTTPS product links", () => {
    expect(isSafeProductUrl("https://shop.example/item")).toBe(true);
    expect(isSafeProductUrl("http://shop.example/item")).toBe(false);
    expect(isSafeProductUrl("javascript:alert(1)")).toBe(false);
  });

  it("normalizes valid budget amounts and rejects non-monetary values", () => {
    expect(normalizeBudgetAmount("5000")).toBe("5 000 ₽");
    expect(normalizeBudgetAmount("5 000 ₽")).toBe("5 000 ₽");
    expect(normalizeBudgetAmount("5\u00a0000 ₽")).toBe("5 000 ₽");
    expect(normalizeBudgetAmount("пять тысяч")).toBeNull();
    expect(normalizeBudgetAmount("0")).toBeNull();
  });
});
