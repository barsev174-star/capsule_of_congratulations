import { describe, expect, it } from "vitest";
import { resolveFinalBestQuotes } from "./quote-selection";

const candidates = [
  "Спасибо за поддержку, которая всегда помогает двигаться дальше.",
  "Ты умеешь замечать хорошее даже в самом непростом дне.",
  "Рядом с тобой рабочие будни становятся легче и теплее.",
  "Ты всегда находишь нужные слова, когда они особенно важны."
];

describe("resolveFinalBestQuotes", () => {
  it("keeps the explicitly saved three current quotes", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates.slice(0, 3), false))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: false });
  });

  it("restores the first three legacy candidates for delivered cards", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "DELIVERED" }, candidates, true))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: true });
  });

  it("does not infer a selection for cards that can still be edited", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates, true))
      .toEqual({ quotes: [], usesLegacyDefault: false });
  });
});
