import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getCardDraftByManagementId: vi.fn(),
  getCardDraftByLegacyManageToken: vi.fn(),
  resolveCardRecoveryToken: vi.fn(),
  getCardManagementAccess: vi.fn(),
  listContributionsByCardId: vi.fn(),
  listCardMediaAssetsByCardId: vi.fn()
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: mocks.redirect }));
vi.mock("@/lib/cards/repository", () => ({
  getCardDraftByManagementId: mocks.getCardDraftByManagementId,
  getCardDraftByLegacyManageToken: mocks.getCardDraftByLegacyManageToken,
  listContributionsByCardId: mocks.listContributionsByCardId,
  listCardMediaAssetsByCardId: mocks.listCardMediaAssetsByCardId
}));
vi.mock("@/lib/manage/recovery-tokens", () => ({
  resolveCardRecoveryToken: mocks.resolveCardRecoveryToken
}));
vi.mock("@/lib/manage/access", () => ({
  getCardManagementAccess: mocks.getCardManagementAccess
}));

import PreviewPage from "./page";

describe("PreviewPage recovery URL migration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the recovery token while sending an unauthenticated old preview URL to the access gate", async () => {
    const card = { id: "11111111-1111-4111-8111-111111111111" };
    mocks.getCardDraftByManagementId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(card);
    mocks.resolveCardRecoveryToken.mockResolvedValue(card.id);
    mocks.getCardManagementAccess.mockResolvedValue({
      allowed: false,
      reason: "unauthenticated",
      currentEmail: null
    });

    await expect(PreviewPage({
      params: Promise.resolve({ manageToken: "old-recovery-secret" })
    })).rejects.toThrow("REDIRECT:/manage/old-recovery-secret");

    expect(mocks.listContributionsByCardId).not.toHaveBeenCalled();
    expect(mocks.listCardMediaAssetsByCardId).not.toHaveBeenCalled();
  });
});
