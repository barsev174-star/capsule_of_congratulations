import { describe, expect, it } from "vitest";
import { semanticEvaluationFixtures } from "@/lib/ai/greeting-semantic-fixtures";
import { buildComposerPrompt, buildExtractorPrompt, validateComposerVariants } from "@/lib/ai/greeting-two-stage";
import { composeGreetingVariants, extractGreetingSemantics } from "@/lib/ai/openai-two-stage-provider";
import { estimateAiUsageCost, sumAiUsageCosts } from "@/lib/ai/usage-cost";

const shouldRun = process.env.RUN_GREETING_EVALUATION === "1";
const requestedLimit = Number(process.env.GREETING_EVALUATION_LIMIT ?? 5);
const fixtureLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(semanticEvaluationFixtures.length, Math.floor(requestedLimit))) : 5;

// This is intentionally opt-in: it makes real provider calls and may spend AI attempts.
describe.skipIf(!shouldRun)("semantic greeting live evaluation", () => {
  for (const fixture of semanticEvaluationFixtures.slice(0, fixtureLimit)) {
    it(fixture.id, async () => {
      const extractor = await extractGreetingSemantics(buildExtractorPrompt(fixture));
      const prompt = buildComposerPrompt(fixture, extractor.plan);
      const result = await composeGreetingVariants(prompt);
      const validation = validateComposerVariants(result.variants, prompt.limits);
      const extractorCost = estimateAiUsageCost(extractor.model, extractor.usage);
      const composerCost = estimateAiUsageCost(result.model, result.usage);
      const totalCostRub = sumAiUsageCosts(extractorCost, composerCost);
      process.stdout.write(`\n[ai-cost] extractor=${extractorCost.totalRub ?? "unknown"} RUB (${extractorCost.inputTokens} input, ${extractorCost.outputTokens} output); composer=${composerCost.totalRub ?? "unknown"} RUB (${composerCost.inputTokens} input, ${composerCost.outputTokens} output); total=${totalCostRub ?? "unknown"} RUB\n`);
      process.stdout.write(`\n[${fixture.id}]\nЧерновик: ${fixture.draftNotes}\nПлан: ${JSON.stringify(extractor.plan)}\nАккуратно: ${result.variants.safe.text}\nТеплее: ${result.variants.warm.text}\nЖивее: ${result.variants.expressive.text}\nHard errors: ${validation.hardErrors.map((item) => item.code).join(", ") || "нет"}\n`);
      expect(validation.hardErrors).toEqual([]);
    }, 90_000);
  }
});
