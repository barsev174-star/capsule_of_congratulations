import { describe, expect, it } from "vitest";
import { semanticEvaluationFixtures } from "@/lib/ai/greeting-semantic-fixtures";
import { buildSemanticPrompt } from "@/lib/ai/greeting-semantic";

describe("semantic greeting evaluation corpus", () => {
  it("contains a broad, non-empty baseline of real form scenarios", () => {
    expect(semanticEvaluationFixtures.length).toBeGreaterThanOrEqual(40);
    expect(new Set(semanticEvaluationFixtures.map((fixture) => fixture.id)).size).toBe(semanticEvaluationFixtures.length);
    expect(semanticEvaluationFixtures.some((fixture) => /юмор/i.test(fixture.draftNotes))).toBe(true);
    expect(semanticEvaluationFixtures.some((fixture) => !fixture.fromLabel)).toBe(true);
    expect(semanticEvaluationFixtures.some((fixture) => fixture.messageLimit <= 120)).toBe(true);
  });

  it("can be converted to the single-call prompt without dropping fields", () => {
    for (const fixture of semanticEvaluationFixtures) {
      const prompt = buildSemanticPrompt(fixture);
      expect(prompt.user).toContain(fixture.recipientName);
      expect(prompt.user).toContain(fixture.occasionText);
      expect(prompt.user).toContain(fixture.draftNotes);
    }
  });
});
