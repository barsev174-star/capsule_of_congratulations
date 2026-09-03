import type { CardDraft } from "@/lib/cards/types";
import { createOrganizerSessionToken, verifyOrganizerSessionToken } from "@/lib/organizer/auth";

const mocks = vi.hoisted(() => ({ token: undefined as string | undefined, set: vi.fn(), organizer: null as null | { email: string }, admin: null as null | { email: string; role: string }, card: null as CardDraft | null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.token ? { value: mocks.token } : undefined, set: mocks.set }) }));
vi.mock("@/lib/organizer/session", () => ({ getOrganizerSession: async () => mocks.organizer }));
vi.mock("@/lib/admin/session", () => ({ getAdminSession: async () => mocks.admin }));
vi.mock("@/lib/cards/repository", () => ({ getCardDraftByManagementId: async () => mocks.card }));

import { createDraftSessionToken, DRAFT_SESSION_COOKIE, DRAFT_SESSION_MAX_AGE, grantNewDraftAccess, hasGuestDraftAccess, readDraftGrants } from "./draft-session";
import { getCardManagementAccess, requireCardManagementAccess, requireCardOrganizer } from "./access";

const secret = "test-secret-with-an-independent-purpose";
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const draft = () => ({ id: firstId, organizerEmail: "", collectionStatus: "DRAFT", paymentStatus: "UNPAID", deliveryStatus: "PREPARING" } as CardDraft);

describe("scoped draft browser access", () => {
  beforeEach(() => {
    vi.stubEnv("ORGANIZER_SESSION_SECRET", secret);
    mocks.token = undefined; mocks.organizer = null; mocks.admin = null; mocks.card = draft(); mocks.set.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects forged payloads, wrong keys, malformed tokens and expired grants", () => {
    const now = Date.now();
    const token = createDraftSessionToken(firstId, undefined, secret, now);
    expect(readDraftGrants(token, secret, now)).toEqual([{ cardId: firstId, exp: Math.floor(now / 1000) + DRAFT_SESSION_MAX_AGE }]);
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(Buffer.from(payload, "base64url").toString().replace(firstId, secondId)).toString("base64url");
    for (const invalid of [`${forged}.${mac}`, `${token}.extra`, "x".repeat(3001), "broken"])
      expect(readDraftGrants(invalid, secret, now)).toEqual([]);
    expect(readDraftGrants(token, "another-secret", now)).toEqual([]);
    expect(readDraftGrants(token, secret, now + DRAFT_SESSION_MAX_AGE * 1000)).toEqual([]);
    expect(readDraftGrants(createOrganizerSessionToken("owner@example.com", secret), secret)).toEqual([]);
    expect(verifyOrganizerSessionToken(token, secret)).toBeNull();
  });

  it("uses HttpOnly/Secure production cookies and preserves another newly created draft", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.token = createDraftSessionToken(firstId, undefined, secret);
    await grantNewDraftAccess(secondId);
    expect(mocks.set).toHaveBeenCalledWith(DRAFT_SESSION_COOKIE, expect.any(String), {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: DRAFT_SESSION_MAX_AGE
    });
    expect(readDraftGrants(mocks.set.mock.calls[0][1], secret).map((g) => g.cardId)).toEqual([firstId, secondId]);
  });

  it("does not authorize a copied URL or a different card, and opts in only for editing", async () => {
    expect(await hasGuestDraftAccess(draft())).toBe(false);
    mocks.token = createDraftSessionToken(firstId, undefined, secret);
    expect(await hasGuestDraftAccess({ ...draft(), id: secondId })).toBe(false);
    expect(await getCardManagementAccess(draft(), { allowGuestDraft: true })).toEqual({ allowed: true, actor: { kind: "guest-draft" } });
    await expect(requireCardManagementAccess(firstId)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(requireCardOrganizer(firstId)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it.each([
    { organizerEmail: "confirmed@example.com" }, { collectionStatus: "OPEN" }, { collectionStatus: "CLOSED" },
    { paymentStatus: "PAID" }, { paymentStatus: "REFUNDED" }, { deliveryStatus: "DELIVERED" },
    { collectionOpenedAt: "2026-09-03" }, { activeAccessGrantId: "grant" }, { activePaidOrderId: "order" },
    { isHidden: true }, { deletedAt: "2026-09-03" }, { purgedAt: "2026-09-03" }
  ] as Partial<CardDraft>[])("revokes draft permission when card state changes: %j", async (change) => {
    mocks.token = createDraftSessionToken(firstId, undefined, secret);
    expect(await hasGuestDraftAccess({ ...draft(), ...change })).toBe(false);
  });

  it("keeps existing owner and staff authorization independent of the guest cookie", async () => {
    mocks.token = createDraftSessionToken(firstId, undefined, secret);
    const owned = { ...draft(), organizerEmail: "owner@example.com" };
    mocks.organizer = { email: "other@example.com" };
    expect(await getCardManagementAccess(owned, { allowGuestDraft: true })).toMatchObject({ allowed: false });
    mocks.organizer = { email: "owner@example.com" };
    expect(await getCardManagementAccess(owned)).toMatchObject({ allowed: true, actor: { kind: "organizer" } });
    mocks.organizer = null; mocks.admin = { email: "support@example.com", role: "support" };
    expect(await getCardManagementAccess(draft(), { allowGuestDraft: true })).toMatchObject({ allowed: false, reason: "staff-role-denied" });
  });

  it.each(["admin", "moderator"])("keeps the creator flow when a %s session is also present", async (role) => {
    mocks.admin = { email: `${role}@example.com`, role };
    mocks.token = createDraftSessionToken(firstId, undefined, secret);
    expect(await getCardManagementAccess(draft(), { allowGuestDraft: true })).toEqual({ allowed: true, actor: { kind: "guest-draft" } });
    // Staff privileges remain separate and do not become ownership rights.
    expect(await getCardManagementAccess(draft())).toMatchObject({ allowed: true, actor: { kind: "staff", role } });
    await expect(requireCardOrganizer(firstId)).rejects.toMatchObject({ code: "forbidden" });
    for (const other of [{ ...draft(), id: secondId }, { ...draft(), organizerEmail: "owner@example.com" }]) {
      expect(await getCardManagementAccess(other, { allowGuestDraft: true })).toMatchObject({ allowed: true, actor: { kind: "staff", role } });
    }
    mocks.token = undefined;
    expect(await getCardManagementAccess(draft(), { allowGuestDraft: true })).toMatchObject({ allowed: true, actor: { kind: "staff", role } });
  });
});
