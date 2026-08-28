import { describe, expect, it } from "vitest";
import { semanticEvaluationFixtures } from "@/lib/ai/greeting-semantic-fixtures";
import { buildComposerPrompt, buildComposerRepairPrompt, buildComposerReviewPrompt, buildExtractorPrompt, stabilizeComposerVariants, stabilizeGreetingSemanticPlan, validateComposerVariants } from "@/lib/ai/greeting-two-stage";
import { composeGreetingVariants, extractGreetingSemantics, repairGreetingVariant } from "@/lib/ai/routerai-yandex-provider";
import { estimateAiUsageCost, sumAiUsageCosts } from "@/lib/ai/usage-cost";

const shouldRun = process.env.RUN_GREETING_EVALUATION === "1";
const shouldReview = process.env.GREETING_EVALUATION_REVIEW === "1";
const requestedLimit = Number(process.env.GREETING_EVALUATION_LIMIT ?? 5);
const fixtureLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(semanticEvaluationFixtures.length, Math.floor(requestedLimit))) : 5;
const requestedFixtureIds = new Set(
  (process.env.GREETING_EVALUATION_FIXTURES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const selectedFixtures = requestedFixtureIds.size > 0
  ? semanticEvaluationFixtures.filter((fixture) => requestedFixtureIds.has(fixture.id))
  : semanticEvaluationFixtures.slice(0, fixtureLimit);

// This is intentionally opt-in: it makes real provider calls and may spend AI attempts.
describe.skipIf(!shouldRun)("semantic greeting live evaluation", () => {
  for (const fixture of selectedFixtures) {
    it(fixture.id, async () => {
      const extractor = await extractGreetingSemantics(buildExtractorPrompt(fixture));
      const plan = stabilizeGreetingSemanticPlan(fixture, extractor.plan);
      const prompt = buildComposerPrompt(fixture, plan);
      const result = await composeGreetingVariants(prompt);
      let compositionPlans = result.compositionPlans;
      let variants = stabilizeComposerVariants(result.variants, plan);
      let validation = validateComposerVariants(variants, prompt.limits, plan, fixture.occasionText, compositionPlans, prompt.planRequirements);
      const repairCosts: ReturnType<typeof estimateAiUsageCost>[] = [];
      const repairedTypes = new Set<keyof typeof variants>();
      while (validation.hardErrors.length > 0 && repairedTypes.size < 3) {
        const error = validation.hardErrors.find((item) => !repairedTypes.has(item.type));
        if (!error) break;
        const repair = await repairGreetingVariant(buildComposerRepairPrompt(prompt, error.type, variants[error.type].text, error.code, error.detail), error.type);
        variants = stabilizeComposerVariants({ ...variants, [error.type]: { text: repair.text } }, plan);
        repairedTypes.add(error.type);
        repairCosts.push(estimateAiUsageCost(repair.model, repair.usage));
        validation = validateComposerVariants(variants, prompt.limits, plan, fixture.occasionText, compositionPlans, prompt.planRequirements);
      }
      const beforeReview = variants;
      const review = shouldReview ? await composeGreetingVariants(buildComposerReviewPrompt(prompt, variants)) : null;
      const reviewCost = review ? estimateAiUsageCost(review.model, review.usage) : null;
      if (review) {
        variants = stabilizeComposerVariants(review.variants, plan);
        compositionPlans = review.compositionPlans;
        validation = validateComposerVariants(variants, prompt.limits, plan, fixture.occasionText, compositionPlans, prompt.planRequirements);
      }
      const extractorCost = estimateAiUsageCost(extractor.model, extractor.usage);
      const composerCost = estimateAiUsageCost(result.model, result.usage);
      const totalCostRub = sumAiUsageCosts(extractorCost, composerCost, ...repairCosts, ...[reviewCost].filter((cost): cost is NonNullable<typeof cost> => Boolean(cost)));
      process.stdout.write(`\n[ai-cost] extractor=${extractorCost.totalRub ?? "unknown"} RUB (${extractorCost.inputTokens} input, ${extractorCost.outputTokens} output); composer=${composerCost.totalRub ?? "unknown"} RUB (${composerCost.inputTokens} input, ${composerCost.outputTokens} output); repairs=${repairCosts.map((cost) => cost.totalRub ?? "unknown").join("+") || "none"} RUB; review=${reviewCost?.totalRub ?? "none"} RUB; total=${totalCostRub ?? "unknown"} RUB\n`);
      process.stdout.write(`\n[${fixture.id}]\nЧерновик: ${fixture.draftNotes}\nСмысловой план: ${JSON.stringify(plan)}\nКомпозиционные планы: ${JSON.stringify(compositionPlans)}${review ? `\nДо редактора: ${JSON.stringify(beforeReview)}` : ""}\nАккуратно: ${variants.safe.text}\nТеплее: ${variants.warm.text}\nЖивее: ${variants.expressive.text}\nRepairs: ${Array.from(repairedTypes).join(", ") || "нет"}\nReview: ${review ? "да" : "нет"}\nHard errors: ${validation.hardErrors.map((item) => item.code).join(", ") || "нет"}\nSoft warnings: ${validation.softWarnings.map((item) => item.code).join(", ") || "нет"}\n`);
      expect(validation.hardErrors).toEqual([]);
    }, 90_000);
  }
});
