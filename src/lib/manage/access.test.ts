import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft } from "@/lib/cards/types";

const mocks = vi.hoisted(() => ({
  getOrganizerSession: vi.fn(),
  getAdminSession: vi.fn(),
  getCardDraftByManagementId: vi.fn()
}));

vi.mock("@/lib/organizer/session", () => ({ getOrganizerSession: mocks.getOrganizerSession }));
vi.mock("@/lib/admin/session", () => ({ getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/cards/repository", () => ({ getCardDraftByManagementId: mocks.getCardDraftByManagementId }));

import { getCardManagementAccess, requireCardManagementAccess } from "./access";

const card = { id: "card-1", organizerEmail: "Owner@Example.com" } as CardDraft;

describe("card management access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrganizerSession.mockResolvedValue(null);
    mocks.getAdminSession.mockResolvedValue(null);
    mocks.getCardDraftByManagementId.mockResolvedValue(card);
  });

  it("allows the organizer session with a normalized owner email", async () => {
    mocks.getOrganizerSession.mockResolvedValue({ email: " owner@example.com " });
    await expect(getCardManagementAccess(card)).resolves.toEqual({
      allowed: true,
      actor: { kind: "organizer", email: "owner@example.com" }
    });
  });

  it.each(["admin", "moderator"] as const)("allows a %s staff session", async (role) => {
    mocks.getAdminSession.mockResolvedValue({ email: `${role}@example.com`, role });
    await expect(getCardManagementAccess(card)).resolves.toMatchObject({
      allowed: true,
      actor: { kind: "staff", role }
    });
  });

  it("denies support even when an admin session exists", async () => {
    mocks.getAdminSession.mockResolvedValue({ email: "support@example.com", role: "support" });
    await expect(getCardManagementAccess(card)).resolves.toEqual({
      allowed: false,
      reason: "staff-role-denied",
      currentEmail: "support@example.com"
    });
  });

  it("denies another organizer and an anonymous visitor", async () => {
    mocks.getOrganizerSession.mockResolvedValue({ email: "other@example.com" });
    await expect(getCardManagementAccess(card)).resolves.toMatchObject({ allowed: false, reason: "wrong-organizer" });
    mocks.getOrganizerSession.mockResolvedValue(null);
    await expect(requireCardManagementAccess(card.id)).rejects.toMatchObject({ code: "unauthenticated" });
  });
});
