import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCardDraftByManageToken: vi.fn(),
  updateCardStatus: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  loggerInfo: vi.fn()
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/cards/repository", () => ({
  getCardDraftByManageToken: mocks.getCardDraftByManageToken,
  updateCardStatus: mocks.updateCardStatus
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: mocks.loggerInfo, warn: vi.fn(), error: vi.fn() },
  sanitizeLogContext: (context: unknown) => context
}));

import { publishCardAction } from "@/lib/cards/actions";

const card = {
  id: "card-id",
  manageToken: "manage-token",
  finalSlug: "final-slug",
  status: "ready",
  paymentStatus: "unpaid"
};

describe("publishCardAction", () => {
  const previousMode = process.env.PUBLICATION_MODE;

  beforeEach(() => {
    mocks.getCardDraftByManageToken.mockResolvedValue(card);
    mocks.updateCardStatus.mockResolvedValue(undefined);
    process.env.PUBLICATION_MODE = "free";
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (previousMode === undefined) {
      delete process.env.PUBLICATION_MODE;
    } else {
      process.env.PUBLICATION_MODE = previousMode;
    }
  });

  it("publishes an unpaid card during free beta", async () => {
    const formData = new FormData();
    formData.set("manageToken", card.manageToken);

    await expect(publishCardAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.updateCardStatus).toHaveBeenCalledWith(card.id, "published");
    expect(mocks.redirect).toHaveBeenCalledWith(`/gift/${card.finalSlug}`);
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      "funnel.card_published",
      "User journey event",
      { cardId: card.id, publicationMode: "free" }
    );
  });

  it("does not bypass payment when paid mode is enabled", async () => {
    process.env.PUBLICATION_MODE = "paid";
    const formData = new FormData();
    formData.set("manageToken", card.manageToken);

    await expect(publishCardAction(formData)).rejects.toThrow("Paid publication is not configured yet");

    expect(mocks.updateCardStatus).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
