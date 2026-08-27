import { describe, expect, it } from "vitest";
import { estimateAiUsageCost, sumAiUsageCosts } from "@/lib/ai/usage-cost";

describe("AI usage cost", () => {
  it("uses RouterAI rates and cached-input pricing", () => {
    expect(estimateAiUsageCost("gpt-5-mini-2025-08-07", {
      inputTokens: 1_000_000,
      cachedInputTokens: 100_000,
      outputTokens: 1_000_000
    })).toMatchObject({ inputRub: 24.98008, outputRub: 219.6051, totalRub: 244.58518 });
  });

  it("estimates YandexGPT 5.1 Pro usage returned by RouterAI", () => {
    expect(estimateAiUsageCost("yandex/gpt-pro-5.1", {
      inputTokens: 1_000,
      outputTokens: 500
    })).toMatchObject({ inputRub: 0.581954, outputRub: 0.290977, totalRub: 0.87293 });
  });

  it("does not invent a cost for an unknown model", () => {
    const unknown = estimateAiUsageCost("another-provider/model", { inputTokens: 10, outputTokens: 20 });
    expect(unknown.totalRub).toBeNull();
    expect(sumAiUsageCosts(unknown)).toBeNull();
  });
});
