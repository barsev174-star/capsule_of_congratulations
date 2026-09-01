import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminRole: vi.fn(),
  getAdminCardById: vi.fn()
}));

vi.mock("@/lib/admin/session", () => ({ requireAdminRole: mocks.requireAdminRole }));
vi.mock("@/lib/admin/repository", () => ({ getAdminCardById: mocks.getAdminCardById }));
vi.mock("@/lib/ai/repository", () => ({ getAiUsageSummary: vi.fn() }));
vi.mock("@/lib/cards/access-grants", () => ({ getActiveCardAccessGrant: vi.fn() }));
vi.mock("../../../actions", () => ({
  grantCardAccessAdminAction: vi.fn(),
  revokeCardAccessAdminAction: vi.fn(),
  updateAiBonusLimitAdminAction: vi.fn()
}));

import AdminCardDetailPage from "./page";

describe("AdminCardDetailPage authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks moderator access before loading card details", async () => {
    mocks.requireAdminRole.mockRejectedValue(new Error("Forbidden"));
    await expect(AdminCardDetailPage({ params: Promise.resolve({ id: "known-card" }) })).rejects.toThrow("Forbidden");
    expect(mocks.requireAdminRole).toHaveBeenCalledWith("moderator");
    expect(mocks.getAdminCardById).not.toHaveBeenCalled();
  });
});
