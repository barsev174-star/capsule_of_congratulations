import { describe, expect, it } from "vitest";
import { semanticEvaluationFixtures } from "@/lib/ai/greeting-semantic-fixtures";
import { buildSemanticPrompt, validateSemanticVariants } from "@/lib/ai/greeting-semantic";
import { generateSemanticGreetingWithOpenAi } from "@/lib/ai/openai-semantic-provider";

const shouldRun = process.env.RUN_GREETING_EVALUATION === "1";
const requestedLimit = Number(process.env.GREETING_EVALUATION_LIMIT ?? 5);
const fixtureLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(semanticEvaluationFixtures.length, Math.floor(requestedLimit))) : 5;

// This is intentionally opt-in: it makes real provider calls and may spend AI attempts.
describe.skipIf(!shouldRun)("semantic greeting live evaluation", () => {
  for (const fixture of semanticEvaluationFixtures.slice(0, fixtureLimit)) {
    it(fixture.id, async () => {
      const prompt = buildSemanticPrompt(fixture);
      const result = await generateSemanticGreetingWithOpenAi(prompt);
      const validation = validateSemanticVariants(result.variants, prompt.limits);
      process.stdout.write(`\n[${fixture.id}]\nЧерновик: ${fixture.draftNotes}\nАккуратно: ${result.variants.safe.text}\nТеплее: ${result.variants.warm.text}\nЖивее: ${result.variants.expressive.text}\nМягкие предупреждения: ${validation.softWarnings.map((warning) => warning.code).join(", ") || "нет"}\n`);
      expect(validation.hardErrors).toEqual([]);
    }, 90_000);
  }
});
