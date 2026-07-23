import { describe, expect, it } from "vitest";
import { buildComposerPrompt, buildExtractorPrompt, getSafeFactCoverageSignal, getSemanticPlanCacheKey, validateComposerVariants } from "@/lib/ai/greeting-two-stage";

const input = { recipientName: "Ирина Олеговна", occasionText: "С Днём педагога!", fromLabel: "Татьяна, родитель", draftNotes: "Она чуткая. Нужен лёгкий юмор в конце.", messageLimit: 280 };
const plan = { authorVoice: "I", authorGender: "UNKNOWN", addressForm: "VY", recipientNumber: "ONE", coreFacts: ["чуткая"], contextFacts: [], appreciation: [], wishes: [], derivedQualities: [], editorialIntent: { humor: "LIGHT", humorPlacement: "ENDING", warmthRequested: false, expressivenessRequested: false, otherNotes: ["Нужен лёгкий юмор в конце"] }, phrasesWorthPreserving: [], ambiguities: [] } as const;

describe("two-stage greeting generation", () => {
  it("sends the raw draft only to the extractor", () => {
    expect(buildExtractorPrompt(input).user).toContain("Нужен лёгкий юмор");
    const composer = buildComposerPrompt(input, plan);
    expect(composer.user).not.toContain("Нужен лёгкий юмор");
    expect(composer.user).not.toContain("otherNotes");
    expect(composer.user).toContain("С Днём педагога!");
    expect(composer.user).toContain("Повод: С Днём педагога!");
    expect(composer.user).toContain("\"authorGender\":\"UNKNOWN\"");
  });

  it("uses a stable cache key for an unchanged normalized draft", () => {
    expect(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая.\nНужен лёгкий юмор в конце." })).toBe(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая.\r\nНужен лёгкий юмор в конце." }));
    expect(getSemanticPlanCacheKey(input)).not.toBe(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая. Без юмора." }));
  });

  it("keeps hard validation objective", () => {
    const result = validateComposerVariants({ safe: { text: "С Днём педагога!" }, warm: { text: "С Днём педагога!" }, expressive: { text: "Текст".repeat(100) } }, { safe: 280, warm: 280, expressive: 280 });
    expect(result.hardErrors.map((item) => item.code)).toEqual(expect.arrayContaining(["DUPLICATE", "TOO_LONG"]));
  });

  it("reports fact coverage without rejecting a greeting", () => {
    expect(getSafeFactCoverageSignal(plan, "С Днём педагога! Вы чуткая.")).toEqual({ total: 1, matched: 1, ratio: 1 });
    expect(getSafeFactCoverageSignal(plan, "С Днём педагога!")).toEqual({ total: 1, matched: 0, ratio: 0 });
  });
});
