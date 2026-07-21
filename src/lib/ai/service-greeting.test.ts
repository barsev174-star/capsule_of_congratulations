import { vi } from "vitest";
import { AiError } from "@/lib/ai/types";
import type { AiGenerationInput, AiProviderResult } from "@/lib/ai/types";

const mocks = vi.hoisted(() => ({
  generateWithGigaChat: vi.fn(),
  generateWithOpenAi: vi.fn(),
  generateMatrixWithOpenAi: vi.fn(),
  generateLadderWithOpenAi: vi.fn(),
  generateGreetingContentPlanWithOpenAi: vi.fn(),
  generateTwoStepVariantsWithOpenAi: vi.fn(),
  generateBestQuotesWithOpenAi: vi.fn(),
  generateQualitiesWithOpenAi: vi.fn(),
  completeAiGeneration: vi.fn(),
  releaseAiGeneration: vi.fn()
}));

vi.mock("@/lib/ai/gigachat-provider", () => ({
  generateWithGigaChat: mocks.generateWithGigaChat,
  generateBestQuotesWithGigaChat: vi.fn(),
  generateQualitiesWithGigaChat: vi.fn()
}));

vi.mock("@/lib/ai/openai-provider", () => ({
  generateWithOpenAi: mocks.generateWithOpenAi,
  generateMatrixWithOpenAi: mocks.generateMatrixWithOpenAi,
  getOpenAiMatrixPromptVersion: () => "greeting-openai-matrix-v4",
  OPENAI_GREETING_PROMPT_VERSION: "greeting-openai-v3",
  OPENAI_MATRIX_PROMPT_V3: "greeting-openai-matrix-v3",
  OPENAI_MATRIX_PROMPT_VERSION: "greeting-openai-matrix-v4"
}));

vi.mock("@/lib/ai/openai-ladder-provider", () => ({
  generateLadderWithOpenAi: mocks.generateLadderWithOpenAi,
  OPENAI_LADDER_PROMPT_VERSION: "greeting-openai-ladder-v1"
}));

vi.mock("@/lib/ai/openai-two-step-provider", () => ({
  generateGreetingContentPlanWithOpenAi: mocks.generateGreetingContentPlanWithOpenAi,
  generateTwoStepVariantsWithOpenAi: mocks.generateTwoStepVariantsWithOpenAi
}));

vi.mock("@/lib/ai/openai-insights-provider", () => ({
  generateBestQuotesWithOpenAi: mocks.generateBestQuotesWithOpenAi,
  generateQualitiesWithOpenAi: mocks.generateQualitiesWithOpenAi
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
  completeAiUsageEvent: vi.fn(),
  releaseAiGeneration: mocks.releaseAiGeneration,
  saveAiCardInsight: vi.fn()
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { generateBestQuotes, generateParticipantMessage, generateQualities } from "@/lib/ai/service";

const input: AiGenerationInput = {
  cardId: "card-1",
  recipientName: "Анна Ивановна",
  fromLabel: "от друзей",
  relationshipContext: "сокурсница",
  occasionText: "С выпускным!",
  draftNotes: "Спасибо за помощь во время учёбы. Желаю найти любимую работу и хорошо зарабатывать.",
  style: "warm-simple",
  messageLimit: 280,
  existingMessages: [],
  mode: "compose"
};

const goodResult: AiProviderResult = {
  model: "GigaChat-2-Pro",
  variants: [
    { id: "short", label: "Короткий", text: "Анна, спасибо тебе за помощь в учёбе! Пусть найдётся место, где тебя ценят и хорошо платят." },
    { id: "warm", label: "Душевный", text: "Без твоей поддержки учиться было бы сложнее. Пусть впереди ждёт дело по душе." },
    { id: "style", label: "Ваш стиль", text: "С выпускным! Спасибо, что всегда помогала. Пусть впереди будет хороший старт." }
  ]
};

describe("AI greeting service validation flow", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "gigachat";
    delete process.env.AI_GREETING_PROVIDER;
    delete process.env.AI_GREETING_MODE;
    delete process.env.AI_GREETING_EXPERIMENT;
    mocks.generateWithGigaChat.mockReset();
    mocks.generateWithOpenAi.mockReset();
    mocks.generateMatrixWithOpenAi.mockReset();
    mocks.generateLadderWithOpenAi.mockReset();
    mocks.generateGreetingContentPlanWithOpenAi.mockReset();
    mocks.generateTwoStepVariantsWithOpenAi.mockReset();
    mocks.generateBestQuotesWithOpenAi.mockReset();
    mocks.generateQualitiesWithOpenAi.mockReset();
    mocks.completeAiGeneration.mockClear();
    mocks.releaseAiGeneration.mockClear();
  });

  it("returns success for three valid variants", async () => {
    mocks.generateWithGigaChat.mockResolvedValue(goodResult);

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.completeAiGeneration).toHaveBeenCalledOnce();
  });

  it("routes best quotes and qualities to OpenAI", async () => {
    process.env.AI_INSIGHTS_PROVIDER = "openai";
    const contributions = [
      { id: "one", message: "Спасибо за твою поддержку и умение найти добрые слова в нужный момент.", updatedAt: "2026-01-01" },
      { id: "two", message: "Твоё чувство юмора делает каждый обычный день намного светлее и теплее.", updatedAt: "2026-01-02" },
      { id: "three", message: "На тебя всегда можно положиться, и рядом с тобой становится спокойнее.", updatedAt: "2026-01-03" }
    ] as never;
    mocks.generateBestQuotesWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      quotes: [
        { text: "Спасибо за твою поддержку и умение найти добрые слова в нужный момент.", sourceContributionId: "one" },
        { text: "Твоё чувство юмора делает каждый обычный день намного светлее и теплее.", sourceContributionId: "two" },
        { text: "На тебя всегда можно положиться, и рядом с тобой становится спокойнее.", sourceContributionId: "three" }
      ]
    });
    mocks.generateQualitiesWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
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

    expect(quotes.insight.provider).toBe("openai");
    expect(qualities.insight.provider).toBe("openai");
    expect(mocks.generateBestQuotesWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateQualitiesWithOpenAi).toHaveBeenCalledOnce();
    delete process.env.AI_INSIGHTS_PROVIDER;
  });

  it("routes greeting generation to the OpenAI provider", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    mocks.generateWithOpenAi.mockResolvedValue({ ...goodResult, model: "gpt-5-mini" });

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.generateWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateWithGigaChat).not.toHaveBeenCalled();
    delete process.env.AI_GREETING_PROVIDER;
  });

  it("uses matrix internally while preserving the public three-variant contract", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "matrix";
    mocks.generateMatrixWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      usage: { inputTokens: 500, outputTokens: 600, totalTokens: 1100 },
      variants: [
        { id: "short", label: "Короткий", text: "Анна, спасибо за помощь во время учёбы! Пусть впереди всё сложится хорошо." },
        { id: "warm", label: "Душевный", text: "Спасибо, что всегда приходила на помощь. Это действительно многое для меня значило." },
        { id: "warm-simple", label: "Тепло и просто", text: "С выпускным! Спасибо за поддержку — с тобой учиться было намного легче." },
        { id: "short-no-pathos", label: "Коротко без пафоса", text: "Спасибо за помощь. Удачи после выпуска!" },
        { id: "humor", label: "С лёгким юмором", text: "Без тебя мои оценки были бы скромнее — похоже, диплом немного и твоя заслуга." },
        { id: "touching", label: "Трогательно", text: "Твоя поддержка сделала годы учёбы легче. Спасибо, что была рядом." },
        { id: "respectful", label: "Уважительно", text: "Анна, спасибо за ответственность и готовность всегда помочь." }
      ]
    });

    const result = await generateParticipantMessage(input);

    expect(result.variants.map((variant) => variant.id)).toEqual(["short", "warm", "style"]);
    expect(result.variants[2].text).toContain("С выпускным");
    expect(mocks.generateMatrixWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateWithOpenAi).not.toHaveBeenCalled();
  });

  it("uses ladder while preserving the public variant ids", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "ladder";
    mocks.generateLadderWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      usage: { totalTokens: 900 },
      variants: [
        { type: "safe", label: "Аккуратно", text: "Анна, с выпускным! Спасибо за помощь во время учёбы." },
        { type: "warm", label: "Теплее", text: "Анна, с выпускным! Спасибо, что помогала мне всю учёбу — это многое значило." },
        { type: "expressive", label: "Живее", text: "Анна, поздравляю с выпускным! Благодаря твоей помощи учиться было заметно легче." }
      ]
    });

    const result = await generateParticipantMessage({ ...input, recipientName: "Анна" });

    expect(result.variants.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "short", label: "Аккуратно" },
      { id: "warm", label: "Теплее" },
      { id: "style", label: "Живее" }
    ]);
    expect(mocks.generateLadderWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateMatrixWithOpenAi).not.toHaveBeenCalled();
  });

  it("uses the isolated two-step experiment only when enabled", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "ladder";
    process.env.AI_GREETING_EXPERIMENT = "two_step";
    mocks.generateGreetingContentPlanWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      usage: { totalTokens: 300 },
      plan: {
        generalActions: ["помогает во время учёбы"],
        personalEpisodes: ["поддержала автора перед экзаменом"],
        wishes: ["успехов"],
        derivedQualities: ["отзывчивость"],
        creativeRequest: "",
        optionalContextDetails: []
      }
    });
    mocks.generateTwoStepVariantsWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      usage: { totalTokens: 700 },
      variants: [
        { type: "safe", label: "Аккуратно", text: "Анна Ивановна, с выпускным! Спасибо за помощь во время учёбы. Желаем успехов." },
        { type: "warm", label: "Теплее", text: "Анна Ивановна, с выпускным! Спасибо за отзывчивость и помощь во время учёбы. Желаем успехов." },
        { type: "expressive", label: "Живее", text: "Анна Ивановна, с выпускным! Спасибо за помощь во время учёбы. Пусть впереди будет много удачных дней!" }
      ]
    });

    const result = await generateParticipantMessage(input);

    expect(result.variants.map((variant) => variant.id)).toEqual(["short", "warm", "style"]);
    expect(mocks.generateGreetingContentPlanWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateTwoStepVariantsWithOpenAi).toHaveBeenCalledOnce();
    expect(mocks.generateLadderWithOpenAi).not.toHaveBeenCalled();
  });

  it("retries only a rejected ladder level", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "ladder";
    mocks.generateLadderWithOpenAi
      .mockResolvedValueOnce({
        model: "gpt-5-mini",
        usage: { totalTokens: 900 },
        variants: [
          { type: "safe", label: "Аккуратно", text: "Анна, с выпускным! Спасибо за помощь во время учёбы." },
          { type: "warm", label: "Теплее", text: "Анна, с выпускным! Спасибо, что помогала мне всю учёбу — это многое значило." },
          { type: "expressive", label: "Живее", text: "Анна, мы поздравляем тебя с выпускным и желаем удачи." }
        ]
      })
      .mockResolvedValueOnce({
        model: "gpt-5-mini",
        usage: { totalTokens: 500 },
        variants: [
          { type: "expressive", label: "Живее", text: "Анна, поздравляю с выпускным! Благодаря твоей помощи учиться было заметно легче." }
        ]
      });

    const result = await generateParticipantMessage({ ...input, recipientName: "Анна", fromLabel: "от сокурсника" });

    expect(result.variants[2].text).toContain("Благодаря твоей помощи");
    expect(mocks.generateLadderWithOpenAi).toHaveBeenCalledTimes(2);
    expect(mocks.generateLadderWithOpenAi.mock.calls[1][0].requestedTypes).toEqual(["expressive"]);
  });

  it("uses valid matrix fallbacks without a second provider request", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "matrix";
    mocks.generateMatrixWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      usage: { inputTokens: 500, outputTokens: 600, totalTokens: 1100 },
      variants: [
        { id: "short", label: "Короткий", text: "Анна, поздравляю с выпускным! Спасибо, что всегда помогала мне. Пусть найдётся работа по душе и хороший доход." },
        { id: "warm", label: "Душевный", text: "Я благодарен за твою помощь во время учёбы. Это многое для меня значило." },
        { id: "warm-simple", label: "Тепло и просто", text: "Анна, с выпускным! Спасибо за поддержку — с тобой учиться было намного легче." },
        { id: "short-no-pathos", label: "Коротко без пафоса", text: "Анна, спасибо за помощь во время учёбы! Удачи после выпуска." },
        { id: "humor", label: "С лёгким юмором", text: "Без тебя мои оценки были бы скромнее — похоже, диплом немного и твоя заслуга." },
        { id: "touching", label: "Трогательно", text: "Твоя поддержка сделала годы учёбы легче. Спасибо, что была рядом." },
        { id: "respectful", label: "Уважительно", text: "Анна, спасибо за ответственность и готовность всегда помочь." }
      ]
    });

    const result = await generateParticipantMessage(input);

    expect(result.variants[0].text).toContain("Удачи после выпуска");
    expect(result.variants[1].text).toContain("годы учёбы легче");
    expect(mocks.generateMatrixWithOpenAi).toHaveBeenCalledOnce();
  });

  it("returns a safe local trio instead of a validation error", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    process.env.AI_GREETING_MODE = "matrix";
    const unsafeMatrix = {
      model: "gpt-5-mini",
      variants: [
        { id: "short", label: "Короткий", text: "Ты тащила меня всю учёбу." },
        { id: "warm", label: "Душевный", text: "Ты была моей спасательной лодкой." },
        { id: "warm-simple", label: "Тепло и просто", text: "Ты спасала меня от провала." },
        { id: "short-no-pathos", label: "Коротко без пафоса", text: "Ты подставляла голову вместо меня." },
        { id: "humor", label: "С лёгким юмором", text: "Теперь знания станут чьей-то головной болью." },
        { id: "touching", label: "Трогательно", text: "Без тебя я бы пропал." },
        { id: "respectful", label: "Уважительно", text: "Ты тащила всё на себе." }
      ]
    };
    mocks.generateMatrixWithOpenAi.mockResolvedValue(unsafeMatrix);

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(result.variants.every((variant) => !variant.text.includes("тащила"))).toBe(true);
    expect(mocks.generateMatrixWithOpenAi).toHaveBeenCalledTimes(2);
    expect(mocks.completeAiGeneration).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini-safe-fallback"
    }));
  });

  it("accepts naturally rephrased career wishes", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    mocks.generateWithOpenAi.mockResolvedValue({
      model: "gpt-5-mini",
      variants: [
        { id: "short", label: "Короткий", text: "Анна, поздравляю с выпускным! Пусть найдётся дело по душе и место, где тебя ценят." },
        { id: "warm", label: "Душевный", text: "Спасибо за помощь во время учёбы. Желаю тебе интересных задач и возможности уверенно расти." },
        { id: "style", label: "Ваш стиль", text: "С выпускным! Пусть впереди ждут любимое дело, хороший коллектив и доход, который радует." }
      ]
    });

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.generateWithOpenAi).toHaveBeenCalledOnce();
    delete process.env.AI_GREETING_PROVIDER;
  });

  it("returns AI_VALIDATION_FAILED for valid JSON with a forbidden phrase", async () => {
    const badResult = {
      ...goodResult,
      variants: goodResult.variants.map((variant, index) =>
        index === 0 ? { ...variant, text: "Поздравляю с этим знаменательным событием!" } : variant
      )
    };
    mocks.generateWithGigaChat.mockResolvedValue(badResult);

    await expect(generateParticipantMessage(input)).rejects.toMatchObject({ code: "AI_VALIDATION_FAILED" });
  });

  it("retries one bad variant and succeeds without rejecting good variants", async () => {
    const firstResult = {
      ...goodResult,
      variants: goodResult.variants.map((variant, index) =>
        index === 0 ? { ...variant, text: "Поздравляю с этим знаменательным событием!" } : variant
      )
    };
    mocks.generateWithGigaChat
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(goodResult);

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.generateWithGigaChat).toHaveBeenCalledTimes(2);
    expect(mocks.generateWithGigaChat.mock.calls[1][0].requestedVariantTypes).toEqual(["short"]);
  });

  it("preserves INVALID_JSON after two malformed provider responses", async () => {
    mocks.generateWithGigaChat.mockRejectedValue(new AiError("INVALID_JSON", "broken JSON"));

    await expect(generateParticipantMessage(input)).rejects.toMatchObject({ code: "INVALID_JSON" });
    expect(mocks.generateWithGigaChat).toHaveBeenCalledTimes(2);
  });

  it("keeps good OpenAI variants and retries only the rejected type", async () => {
    process.env.AI_GREETING_PROVIDER = "openai";
    mocks.generateWithOpenAi
      .mockResolvedValueOnce({
        ...goodResult,
        model: "gpt-5-mini",
        variants: goodResult.variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Анна, желаю тебе найти работу мечты и добиться карьерного роста." } : variant
        )
      })
      .mockResolvedValueOnce({
        model: "gpt-5-mini",
        variants: [{
          id: "short",
          label: "Короткий",
          text: "Анна, пусть после выпуска найдётся дело по душе и место, где тебя ценят."
        }]
      });

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.generateWithOpenAi).toHaveBeenCalledTimes(2);
    expect(mocks.generateWithOpenAi.mock.calls[1][0].requestedVariantTypes).toEqual(["short"]);
    delete process.env.AI_GREETING_PROVIDER;
  });
});
