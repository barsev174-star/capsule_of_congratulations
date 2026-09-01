import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCardDraftByManageToken: vi.fn(),
  listAllContributionsByCardId: vi.fn(),
  updateContributionStatus: vi.fn(),
  getCardLifecycleByManageToken: vi.fn(),
  requireCardManagementAccess: vi.fn()
}));

vi.mock("@/lib/cards/repository", () => ({
  getCardDraftByManageToken: mocks.getCardDraftByManageToken,
  listAllContributionsByCardId: mocks.listAllContributionsByCardId,
  updateContributionStatus: mocks.updateContributionStatus
}));
vi.mock("@/lib/cards/lifecycle-repository", () => ({ getCardLifecycleByManageToken: mocks.getCardLifecycleByManageToken }));
vi.mock("@/lib/manage/access", () => ({ requireCardManagementAccess: mocks.requireCardManagementAccess }));
vi.mock("@/lib/cards/lifecycle", () => ({ assertCardContentEditable: vi.fn(), CardLifecycleConflictError: class extends Error {} }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn() } }));

import { POST } from "./route";

const request = (contributionId: string) => new Request("http://localhost/api/manage/contributions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ manageToken: "card-1", contributionId, status: "hidden" })
});

describe("POST /api/manage/contributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCardDraftByManageToken.mockResolvedValue({ id: "card-1" });
    mocks.requireCardManagementAccess.mockResolvedValue({ actor: { kind: "organizer" } });
    mocks.getCardLifecycleByManageToken.mockResolvedValue({ purgedAt: null });
  });

  it("does not mutate a contribution belonging to another card", async () => {
    mocks.listAllContributionsByCardId.mockResolvedValue([{ id: "own", cardId: "card-1" }]);
    const response = await POST(request("foreign"));
    expect(response.status).toBe(404);
    expect(mocks.updateContributionStatus).not.toHaveBeenCalled();
  });

  it("requires an authenticated owner or management staff", async () => {
    mocks.requireCardManagementAccess.mockRejectedValue(new Error("Forbidden"));
    const response = await POST(request("own"));
    expect(response.status).toBe(403);
    expect(mocks.updateContributionStatus).not.toHaveBeenCalled();
  });
});
