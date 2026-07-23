import { describe, expect, it } from "vitest";
import { defaultGiftPollCopy, isSafeProductUrl, isSystemDefaultPollQuestion, normalizeBudgetAmount, normalizeGiftPollMode } from "./validation";

describe("gift poll validation", () => {
  it("keeps the two supported poll modes", () => {
    expect(normalizeGiftPollMode("gift")).toBe("gift");
    expect(normalizeGiftPollMode("budget")).toBe("budget");
    expect(normalizeGiftPollMode("anything-else")).toBe("gift");
  });

  it("uses clear defaults for gift and budget decisions", () => {
    expect(defaultGiftPollCopy("gift", "Ирина").question).toBe("Какой вариант лучше выбрать для подарка?");
    expect(defaultGiftPollCopy("budget", "Ирина").question).toBe("Какой бюджет лучше выбрать для подарка?");
    expect(defaultGiftPollCopy("budget", "Ирина").title).toContain("бюджет");
  });

  it("recognizes legacy defaults without treating custom questions as defaults", () => {
    expect(isSystemDefaultPollQuestion("Какой бюджет больше подойдёт для подарка Ирине?", "budget", "Ирине")).toBe(true);
    expect(isSystemDefaultPollQuestion("Какой бюджет подойдёт нашей команде?", "budget", "Ирине")).toBe(false);
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
