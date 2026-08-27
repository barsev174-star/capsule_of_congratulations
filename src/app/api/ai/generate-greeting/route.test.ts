import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateParticipantMessage: vi.fn(),
  getCardDraftByPublicSlug: vi.fn(),
  listAllContributionsByCardId: vi.fn(),
  getCardLifecycleByPublicSlug: vi.fn()
}));

vi.mock("@/lib/ai/service", () => ({ generateParticipantMessage: mocks.generateParticipantMessage }));
vi.mock("@/lib/cards/repository", () => ({
  getCardDraftByManageToken: vi.fn(),
  getCardDraftByPublicSlug: mocks.getCardDraftByPublicSlug,
  listAllContributionsByCardId: mocks.listAllContributionsByCardId
}));
vi.mock("@/lib/final-card/message-layout-rules", () => ({
  getFinalCardMessageLayoutProfile: () => ({ maxChars: 280 })
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("@/lib/ai/repository", () => ({ hasPaidAiEntitlement: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ reportCriticalError: vi.fn() }));
vi.mock("@/lib/cards/lifecycle", () => ({ assertCardContentEditable: vi.fn() }));
vi.mock("@/lib/cards/lifecycle-repository", () => ({
  getCardLifecycleByManageToken: vi.fn(),
  getCardLifecycleByPublicSlug: mocks.getCardLifecycleByPublicSlug
}));

import { POST } from "./route";

describe("POST /api/ai/generate-greeting — join contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCardDraftByPublicSlug.mockResolvedValue({
      id: "card-1",
      recipientName: "Наталья",
      fromLabel: "от друзей",
      occasionText: "С днём рождения!",
      finalMessageSettings: null
    });
    mocks.getCardLifecycleByPublicSlug.mockResolvedValue({
      collectionStatus: "OPEN",
      deliveryStatus: "PREPARING",
      purgedAt: null
    });
    mocks.listAllContributionsByCardId.mockResolvedValue([]);
    mocks.generateParticipantMessage.mockResolvedValue({
      generationId: "generation-1",
      variants: [{ id: "style", label: "Творческий", text: "Готовый текст" }],
      usage: { used: 1, limit: 3, remaining: 2 },
      messageLimit: 280
    });
  });

  it("передаёт операцию и активный текст в AI-сервис", async () => {
    const response = await POST(new Request("http://localhost/api/ai/generate-greeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "123e4567-e89b-42d3-a456-426614174000",
        cardId: "card-1",
        publicSlug: "birthday-card",
        draftNotes: "Спасибо за поддержку и помощь в важных делах.",
        relationshipContext: "коллега",
        style: "touching",
        joinAction: "creative",
        sourceText: "Спасибо за поддержку. Желаю счастливых дней.",
        requiredDetail: undefined
      })
    }));

    expect(response.status).toBe(200);
    expect(mocks.generateParticipantMessage).toHaveBeenCalledWith(expect.objectContaining({
      joinAction: "creative",
      sourceText: "Спасибо за поддержку. Желаю счастливых дней."
    }));
  });

  it("передаёт пользовательскую деталь отдельно от 700-символьного черновика", async () => {
    const response = await POST(new Request("http://localhost/api/ai/generate-greeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "123e4567-e89b-42d3-a456-426614174001",
        cardId: "card-1",
        publicSlug: "birthday-card",
        draftNotes: "Спасибо за поддержку и помощь в важных делах.",
        relationshipContext: "коллега",
        style: "touching",
        joinAction: "initial",
        requiredDetail: "Он помог мне с переездом"
      })
    }));

    expect(response.status).toBe(200);
    expect(mocks.generateParticipantMessage).toHaveBeenCalledWith(expect.objectContaining({
      draftNotes: "Спасибо за поддержку и помощь в важных делах.",
      joinAction: "initial",
      requiredDetail: "Он помог мне с переездом"
    }));
  });
});
