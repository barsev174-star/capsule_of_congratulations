import { describe, expect, it } from "vitest";
import {
  extractDraftSpecifics,
  findGenericPhraseIssues,
  matchDraftSpecifics
} from "@/lib/ai/greeting-specifics";

describe("draft specificity", () => {
  const draft = "Всю учёбу она мне помогала, без неё мои оценки были бы хуже. Она пунктуальная и всегда приходит на помощь.";

  it("extracts period, action, consequence and explicit quality", () => {
    const result = extractDraftSpecifics(draft);

    expect(result.strongDetails).toEqual(expect.arrayContaining([
      "period",
      "author-impact",
      "help-action",
      "punctual"
    ]));
    expect(result.specificFacts.length).toBeGreaterThan(0);
    expect(result.personalConsequences).not.toHaveLength(0);
    expect(result.concreteActions).not.toHaveLength(0);
    expect(result.concreteQualities).toContain("punctual");
  });

  it("matches safe paraphrases without inventing new facts", () => {
    const specifics = extractDraftSpecifics(draft);
    expect(matchDraftSpecifics(
      "Анна, спасибо за помощь всю учёбу — без тебя мои оценки были бы скромнее.",
      specifics
    )).toEqual(expect.arrayContaining(["period", "author-impact", "help-action"]));
  });

  it("recognizes generic replacements", () => {
    expect(findGenericPhraseIssues("Пусть рядом будут люди, которые ценят твой труд."))
      .not.toHaveLength(0);
  });
});
