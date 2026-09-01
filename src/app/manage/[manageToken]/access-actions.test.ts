import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getCardDraftByManagementId: vi.fn(),
  getCardDraftByLegacyManageToken: vi.fn(),
  claimCardOrganizerEmail: vi.fn(),
  setOrganizerSession: vi.fn(),
  clearOrganizerSession: vi.fn(),
  resolveCardRecoveryToken: vi.fn()
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/cards/repository", () => ({
  claimCardOrganizerEmail: mocks.claimCardOrganizerEmail,
  getCardDraftByLegacyManageToken: mocks.getCardDraftByLegacyManageToken,
  getCardDraftByManagementId: mocks.getCardDraftByManagementId
}));
vi.mock("@/lib/organizer/session", () => ({
  clearOrganizerSession: mocks.clearOrganizerSession,
  setOrganizerSession: mocks.setOrganizerSession
}));
vi.mock("@/lib/manage/recovery-tokens", () => ({
  resolveCardRecoveryToken: mocks.resolveCardRecoveryToken
}));
vi.mock("@/lib/organizer/service", () => ({ requestOrganizerAccess: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn() }
}));
vi.mock("@/lib/security/public-rate-limit", () => ({
  consumePublicRateLimit: vi.fn(),
  getConfiguredRateLimit: vi.fn(),
  getPublicClientKey: vi.fn()
}));

import { localBypassCardAccessAction } from "./access-actions";

const formData = () => {
  const data = new FormData();
  data.set("cardId", "11111111-1111-4111-8111-111111111111");
  return data;
};

describe("localBypassCardAccessAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
    mocks.getCardDraftByManagementId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      organizerEmail: "owner@example.com"
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("creates the organizer session directly on localhost in development", async () => {
    await expect(localBypassCardAccessAction(formData())).rejects.toThrow(
      "REDIRECT:/manage/11111111-1111-4111-8111-111111111111"
    );
    expect(mocks.setOrganizerSession).toHaveBeenCalledWith("owner@example.com");
  });

  it("is unavailable in production even when the host is localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(localBypassCardAccessAction(formData())).rejects.toThrow(
      "Local authentication bypass is unavailable"
    );
    expect(mocks.getCardDraftByManagementId).not.toHaveBeenCalled();
    expect(mocks.setOrganizerSession).not.toHaveBeenCalled();
  });

  it("is unavailable on a non-loopback host in development", async () => {
    mocks.headers.mockResolvedValue(new Headers({ host: "staging.example.com" }));
    await expect(localBypassCardAccessAction(formData())).rejects.toThrow(
      "Local authentication bypass is unavailable"
    );
    expect(mocks.setOrganizerSession).not.toHaveBeenCalled();
  });
});
