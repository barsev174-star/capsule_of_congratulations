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
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates, candidates.slice(0, 3)))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: false });
  });

  it("keeps an explicit selection visible while its source set is marked stale elsewhere", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates, candidates.slice(1, 4)))
      .toEqual({ quotes: candidates.slice(1, 4), usesLegacyDefault: false });
  });

  it("restores the first three legacy candidates for delivered cards", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "DELIVERED" }, candidates, []))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: true });
  });

  it("restores a legacy three-item insight for an editable card", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates.slice(0, 3), []))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: true });
  });

  it("does not infer a selection for cards that can still be edited", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates, []))
      .toEqual({ quotes: [], usesLegacyDefault: false });
  });

  it("does not accept a selection from a replaced candidate set", () => {
    expect(resolveFinalBestQuotes({ deliveryStatus: "PREPARING" }, candidates.slice(0, 3), candidates.slice(1, 4)))
      .toEqual({ quotes: candidates.slice(0, 3), usesLegacyDefault: true });
  });
});
