import { describe, expect, it } from "vitest";
import { estimateAiUsageCost, sumAiUsageCosts } from "@/lib/ai/usage-cost";

describe("AI usage cost", () => {
  it("uses RouterAI rates and cached-input pricing", () => {
    expect(estimateAiUsageCost("gpt-5-mini-2025-08-07", {
      inputTokens: 1_000_000,
      cachedInputTokens: 100_000,
      outputTokens: 1_000_000
    })).toMatchObject({ inputRub: 22.755, outputRub: 204, totalRub: 226.755 });
  });

  it("does not invent a cost for an unknown model", () => {
    const unknown = estimateAiUsageCost("another-provider/model", { inputTokens: 10, outputTokens: 20 });
    expect(unknown.totalRub).toBeNull();
    expect(sumAiUsageCosts(unknown)).toBeNull();
  });
});
