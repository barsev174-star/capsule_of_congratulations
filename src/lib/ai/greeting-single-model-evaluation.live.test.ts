import { describe, expect, it } from "vitest";
import { semanticEvaluationFixtures } from "@/lib/ai/greeting-semantic-fixtures";
import { buildSemanticPrompt } from "@/lib/ai/greeting-semantic";
import { generateSemanticGreetingWithOpenAi } from "@/lib/ai/openai-semantic-provider";
import { estimateAiUsageCost } from "@/lib/ai/usage-cost";

const shouldRun = process.env.RUN_SINGLE_MODEL_EVALUATION === "1";

// One control call for comparing a single-model implementation with two stages.
describe.skipIf(!shouldRun)("single-model greeting live evaluation", () => {
  it("reports tokens and cost", async () => {
    const fixture = semanticEvaluationFixtures[0];
    const result = await generateSemanticGreetingWithOpenAi(buildSemanticPrompt(fixture));
    const cost = estimateAiUsageCost(result.model, result.usage);
    process.stdout.write(`\n[single-model-cost] model=${cost.model}; total=${cost.totalRub ?? "unknown"} RUB (${cost.inputTokens} input, ${cost.outputTokens} output)\nЧерновик: ${fixture.draftNotes}\nАккуратно: ${result.variants.safe.text}\nТеплее: ${result.variants.warm.text}\nЖивее: ${result.variants.expressive.text}\n`);
    expect(result.variants.safe.text).not.toEqual("");
  }, 90_000);
});
