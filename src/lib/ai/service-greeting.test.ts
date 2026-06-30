import { vi } from "vitest";
import { AiError } from "@/lib/ai/types";
import type { AiGenerationInput, AiProviderResult } from "@/lib/ai/types";

const mocks = vi.hoisted(() => ({
  generateWithGigaChat: vi.fn(),
  completeAiGeneration: vi.fn(),
  releaseAiGeneration: vi.fn()
}));

vi.mock("@/lib/ai/gigachat-provider", () => ({
  generateWithGigaChat: mocks.generateWithGigaChat,
  generateBestQuotesWithGigaChat: vi.fn(),
  generateQualitiesWithGigaChat: vi.fn()
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

import { generateParticipantMessage } from "@/lib/ai/service";

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
    mocks.generateWithGigaChat.mockReset();
    mocks.completeAiGeneration.mockClear();
    mocks.releaseAiGeneration.mockClear();
  });

  it("returns success for three valid variants", async () => {
    mocks.generateWithGigaChat.mockResolvedValue(goodResult);

    const result = await generateParticipantMessage(input);

    expect(result.variants).toHaveLength(3);
    expect(mocks.completeAiGeneration).toHaveBeenCalledOnce();
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
  });

  it("preserves INVALID_JSON after two malformed provider responses", async () => {
    mocks.generateWithGigaChat.mockRejectedValue(new AiError("INVALID_JSON", "broken JSON"));

    await expect(generateParticipantMessage(input)).rejects.toMatchObject({ code: "INVALID_JSON" });
    expect(mocks.generateWithGigaChat).toHaveBeenCalledTimes(2);
  });
});
