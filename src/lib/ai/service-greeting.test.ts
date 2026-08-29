import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiGenerationInput } from "@/lib/ai/types";

const mocks = vi.hoisted(() => ({
  extractGreetingSemantics: vi.fn(),
  composeGreetingText: vi.fn(),
  composeGreetingVariants: vi.fn(),
  repairGreetingVariant: vi.fn(),
  generateLiteralGreetingEditWithRouterAi: vi.fn(),
  generateBestQuotesWithRouterAi: vi.fn(),
  generateQualitiesWithRouterAi: vi.fn(),
  completeAiGeneration: vi.fn(),
  completeAiUsageEvent: vi.fn(),
  releaseAiGeneration: vi.fn()
}));

vi.mock("@/lib/ai/routerai-yandex-provider", () => ({
  extractGreetingSemantics: mocks.extractGreetingSemantics,
  composeGreetingText: mocks.composeGreetingText,
  composeGreetingVariants: mocks.composeGreetingVariants,
  repairGreetingVariant: mocks.repairGreetingVariant
}));

vi.mock("@/lib/ai/routerai-greeting-edit-provider", () => ({
  generateLiteralGreetingEditWithRouterAi: mocks.generateLiteralGreetingEditWithRouterAi
}));

vi.mock("@/lib/ai/routerai-insights-provider", () => ({
  generateBestQuotesWithRouterAi: mocks.generateBestQuotesWithRouterAi,
  generateQualitiesWithRouterAi: mocks.generateQualitiesWithRouterAi
}));

vi.mock("@/lib/ai/repository", () => ({
  getAiUsageSummary: vi.fn().mockResolvedValue({
    used: 0,
    limit: 15,
    remaining: 15,
    baseLimit: 5,
    bonusLimit: 10,
    isPaid: false
  }),
  reserveAiGeneration: vi.fn().mockResolvedValue({
    id: "generation-1",
    usage: { used: 1, limit: 15, remaining: 14 }
  }),
  completeAiGeneration: mocks.completeAiGeneration,
  completeAiUsageEvent: mocks.completeAiUsageEvent,
  releaseAiGeneration: mocks.releaseAiGeneration,
  getAiGenerationRequestState: vi.fn().mockResolvedValue(null),
  getCachedSemanticPlan: vi.fn().mockResolvedValue(null),
  cacheSemanticPlan: vi.fn(),
  saveAiCardInsight: vi.fn()
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock("@/lib/telemetry-repository", () => ({ recordTelemetryEvent: vi.fn() }));

import { generateBestQuotes, generateParticipantMessage, generateQualities } from "@/lib/ai/service";

const input: AiGenerationInput = {
  cardId: "card-1",
  recipientName: "Анна Ивановна",
  fromLabel: "от друзей",
  relationshipContext: "сокурсница",
  occasionText: "С выпускным!",
  draftNotes: "Спасибо за помощь во время учёбы. Желаю успехов и радостных дней.",
  style: "warm-simple",
  messageLimit: 280,
  existingMessages: [],
  mode: "compose"
};

const yandexPlan = {
  authorVoice: "I" as const,
  authorGender: "UNKNOWN" as const,
  addressForm: "VY" as const,
  recipientNumber: "ONE" as const,
  coreFacts: [{ id: "f1", text: "помощь во время учёбы", mustPreserve: true }],
  contextFacts: [],
  appreciation: ["помощь во время учёбы"],
  wishes: ["успехов", "радостных дней"],
  derivedQualities: [],
  editorialIntent: {
    humor: "NONE" as const,
    humorPlacement: "ANY" as const,
    warmthRequested: false,
    expressivenessRequested: false,
    otherNotes: []
  },
  phrasesWorthPreserving: [],
  ambiguities: []
};

const contributions = [
  { id: "one", message: "Спасибо за твою поддержку и умение найти добрые слова в нужный момент.", updatedAt: "2026-01-01" },
  { id: "two", message: "Твоё чувство юмора делает каждый обычный день намного светлее и теплее.", updatedAt: "2026-01-02" },
  { id: "three", message: "На тебя всегда можно положиться, и рядом с тобой становится спокойнее.", updatedAt: "2026-01-03" },
  { id: "four", message: "Ты всегда находишь время помочь, даже когда сама занята по горло.", updatedAt: "2026-01-04" },
  { id: "five", message: "С тобой любой разговор становится легче и любая трудность — короче.", updatedAt: "2026-01-05" },
  { id: "six", message: "Спасибо за заботу и внимание к мелочам, которые на самом деле самые важные.", updatedAt: "2026-01-06" }
] as never;

describe("direct Yandex greeting service", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "yandex";
    process.env.AI_GREETING_PROVIDER = "yandex";
    process.env.AI_INSIGHTS_PROVIDER = "yandex";
    delete process.env.AI_GREETING_MODE;
    delete process.env.AI_GREETING_EXPERIMENT;
    mocks.extractGreetingSemantics.mockReset().mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      usage: { totalTokens: 300 },
      durationMs: 5,
      plan: yandexPlan
    });
    mocks.composeGreetingText.mockReset();
    mocks.composeGreetingVariants.mockReset();
    mocks.repairGreetingVariant.mockReset();
    mocks.generateLiteralGreetingEditWithRouterAi.mockReset();
    mocks.generateBestQuotesWithRouterAi.mockReset();
    mocks.generateQualitiesWithRouterAi.mockReset();
    mocks.completeAiGeneration.mockClear();
    mocks.completeAiUsageEvent.mockClear();
    mocks.releaseAiGeneration.mockClear();
  });

  it("returns one MAIN result for participant and organizer join actions", async () => {
    mocks.composeGreetingText.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      usage: { totalTokens: 450 },
      durationMs: 7,
      text: "С выпускным, Анна Ивановна! Благодарю вас за помощь во время учёбы. Желаю успехов и радостных дней."
    });

    const result = await generateParticipantMessage({ ...input, joinAction: "initial" });

    expect(result.variants).toEqual([
      expect.objectContaining({ id: "short", label: "Готовый текст" })
    ]);
    expect(mocks.extractGreetingSemantics).toHaveBeenCalledWith(expect.anything(), { model: "yandex/gpt-pro-5.1", transport: "yandex" });
    expect(mocks.composeGreetingText).toHaveBeenCalledWith(expect.anything(), { model: "yandex/gpt-pro-5.1", transport: "yandex" });
    expect(mocks.composeGreetingVariants).not.toHaveBeenCalled();
    expect(mocks.completeAiGeneration).toHaveBeenCalledWith(expect.objectContaining({ provider: "yandex" }));
  });

  it("repairs all remaining single-result validation issues over multiple passes", async () => {
    mocks.composeGreetingText
      .mockResolvedValueOnce({
        model: "yandex/gpt-pro-5.1",
        usage: { totalTokens: 300 },
        durationMs: 4,
        text: "С выпускным, Анна Ивановна! Поздравляем вас с прекрасным событием."
      })
      .mockResolvedValueOnce({
        model: "yandex/gpt-pro-5.1",
        usage: { totalTokens: 260 },
        durationMs: 4,
        text: "С выпускным, Анна Ивановна! Благодарю вас за помощь во время учёбы."
      })
      .mockResolvedValueOnce({
        model: "yandex/gpt-pro-5.1",
        usage: { totalTokens: 280 },
        durationMs: 4,
        text: "С выпускным, Анна Ивановна! Благодарю вас за помощь во время учёбы. Желаю успехов и радостных дней."
      });

    const result = await generateParticipantMessage({ ...input, joinAction: "initial" });

    expect(result.variants[0].text).toContain("Желаю успехов и радостных дней");
    expect(mocks.composeGreetingText).toHaveBeenCalledTimes(3);
    expect(mocks.composeGreetingText.mock.calls[1][0].user).toContain("AUTHOR_VOICE_MISMATCH");
    expect(mocks.composeGreetingText.mock.calls[1][0].user).toContain("MISSING_REQUIRED_FACT");
    expect(mocks.composeGreetingText.mock.calls[1][0].user).toContain("MISSING_WISH");
    expect(mocks.composeGreetingText.mock.calls[2][0].user).toContain("MISSING_WISH");
    expect(mocks.completeAiGeneration).toHaveBeenCalledOnce();
  });

  it("releases a single-result generation after exhausting repair attempts", async () => {
    mocks.composeGreetingText.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      usage: { totalTokens: 220 },
      durationMs: 3,
      text: "Поздравляем вас с прекрасным событием."
    });

    await expect(generateParticipantMessage({ ...input, joinAction: "initial" }))
      .rejects.toMatchObject({ code: "AI_VALIDATION_FAILED" });

    expect(mocks.composeGreetingText).toHaveBeenCalledTimes(4);
    expect(mocks.completeAiGeneration).not.toHaveBeenCalled();
    expect(mocks.releaseAiGeneration).toHaveBeenCalledWith(expect.any(String));
  });

  it("keeps the three-result server contract for legacy non-join callers on Yandex", async () => {
    mocks.composeGreetingVariants.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      usage: { totalTokens: 700 },
      durationMs: 8,
      variants: {
        safe: { text: "С выпускным, Анна Ивановна! Благодарю вас за помощь во время учёбы. Желаю успехов и радостных дней." },
        warm: { text: "Анна Ивановна, поздравляю вас с выпускным! Спасибо за помощь во время учёбы. Желаю радостных дней и больших успехов." },
        expressive: { text: "С выпускным, Анна Ивановна! Ваша помощь во время учёбы многое для меня значила. Пусть впереди ждут успехи и радостные дни!" }
      }
    });

    const result = await generateParticipantMessage(input);

    expect(result.variants.map((variant) => variant.id)).toEqual(["short", "warm", "style"]);
    expect(mocks.composeGreetingVariants).toHaveBeenCalledOnce();
    expect(mocks.completeAiGeneration).toHaveBeenCalledWith(expect.objectContaining({ provider: "yandex" }));
  });

  it("routes safe editing to Yandex through RouterAI", async () => {
    mocks.generateLiteralGreetingEditWithRouterAi.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      variants: [{ id: "style", label: "Исправленный текст", text: "Анна, спасибо за поддержку и помощь!" }]
    });

    const result = await generateParticipantMessage({
      ...input,
      draftNotes: "Анна, спасибо за поддержку  и помощь!",
      mode: "improve",
      editInstruction: "proofread"
    });

    expect(result.variants).toEqual([expect.objectContaining({ id: "style" })]);
    expect(mocks.generateLiteralGreetingEditWithRouterAi).toHaveBeenCalledOnce();
    expect(mocks.completeAiGeneration).toHaveBeenCalledWith(expect.objectContaining({ provider: "yandex" }));
  });

  it("routes best quotes and qualities to Yandex through RouterAI", async () => {
    mocks.generateBestQuotesWithRouterAi.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      quotes: [
        { text: "Спасибо за твою поддержку и умение найти добрые слова в нужный момент.", sourceContributionId: "one" },
        { text: "Твоё чувство юмора делает каждый обычный день намного светлее и теплее.", sourceContributionId: "two" },
        { text: "На тебя всегда можно положиться, и рядом с тобой становится спокойнее.", sourceContributionId: "three" }
      ]
    });
    mocks.generateQualitiesWithRouterAi.mockResolvedValue({
      model: "yandex/gpt-pro-5.1",
      qualities: [
        { text: "поддержка", sourceContributionId: "one" },
        { text: "доброта", sourceContributionId: "one" },
        { text: "чувство юмора", sourceContributionId: "two" },
        { text: "тепло", sourceContributionId: "two" },
        { text: "надёжность", sourceContributionId: "three" }
      ]
    });

    const quotes = await generateBestQuotes({ cardId: "card-1", recipientName: "Анна", occasionText: "С днём рождения!", contributions });
    const qualities = await generateQualities({ cardId: "card-1", recipientName: "Анна", occasionText: "С днём рождения!", contributions });

    expect(quotes.insight.provider).toBe("yandex");
    expect(qualities.insight.provider).toBe("yandex");
    expect(mocks.generateBestQuotesWithRouterAi).toHaveBeenCalledOnce();
    expect(mocks.generateQualitiesWithRouterAi).toHaveBeenCalledOnce();
  });
});
