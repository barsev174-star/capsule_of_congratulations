import type { CardDraft } from "@/lib/cards/types";

const mocks = vi.hoisted(() => ({
  card: null as CardDraft | null, cookie: undefined as string | undefined, owner: null as null | { email: string },
  staff: null as null | { email: string; role: string },
  save: vi.fn(), open: vi.fn(), pay: vi.fn(), requestEmail: vi.fn(), pending: vi.fn(), claim: vi.fn(), verify: vi.fn()
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => mocks.cookie ? { value: mocks.cookie } : undefined }),
  headers: async () => new Headers({ host: "localhost:3000", "x-forwarded-for": "127.0.0.1" })
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/organizer/session", () => ({ getOrganizerSession: async () => mocks.owner }));
vi.mock("@/lib/admin/session", () => ({ getAdminSession: async () => mocks.staff }));
vi.mock("@/lib/cards/repository", async (original) => ({
  ...await original<typeof import("@/lib/cards/repository")>(),
  getCardDraftByManageToken: async (id: string) => id === mocks.card?.id ? mocks.card : null,
  getCardDraftByManagementId: async (id: string) => id === mocks.card?.id ? mocks.card : null,
  updateCardDraftBasics: mocks.save, claimCardOrganizerEmail: mocks.claim
}));
vi.mock("@/lib/cards/lifecycle-repository", async (original) => ({
  ...await original<typeof import("@/lib/cards/lifecycle-repository")>(),
  getCardLifecycleByManageToken: async () => mocks.card,
  openCollection: mocks.open
}));
vi.mock("@/lib/organizer/service", () => ({ requestOrganizerAccess: mocks.requestEmail, verifyOrganizerAccess: mocks.verify }));
vi.mock("@/lib/organizer/repository", async (original) => ({
  ...await original<typeof import("@/lib/organizer/repository")>(), getPendingOrganizerEmailChange: mocks.pending
}));
vi.mock("@/lib/payments/repository", () => ({ createRobokassaCheckout: mocks.pay }));

import { createDraftSessionToken } from "@/lib/manage/draft-session";
import { resetPublicRateLimitsForTests } from "@/lib/security/public-rate-limit";
import { updateCardBasicsAction, openCollectionAction, deliverCardAction, openGiftPollAction } from "./actions";
import { requestCardAccessAction } from "./access-actions";
import { POST as checkout } from "@/app/api/cards/[manageToken]/payment/checkout/route";
import { POST as openCollectionApi } from "@/app/api/cards/[manageToken]/collection/open/route";
import { GET as verifyEmail } from "@/app/account/verify/route";

const id = "11111111-1111-4111-8111-111111111111";
const secret = "guest-security-test-secret";
const state = { ok: false, message: "" };
const fields = () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ manageToken: id, recipientName: "Анна", fromLabel: "Друзья", occasionText: "С праздником!", organizerName: "Мария", organizerEmail: "new@example.com" })) form.set(key, value);
  return form;
};

describe("guest draft server boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks(); resetPublicRateLimitsForTests(); vi.stubEnv("ORGANIZER_SESSION_SECRET", secret);
    mocks.card = { id, organizerEmail: "", publicSlug: "public", finalSlug: "final", recipientName: "", occasion: "personal", collectionStatus: "DRAFT", paymentStatus: "UNPAID", deliveryStatus: "PREPARING", purgedAt: null } as CardDraft;
    mocks.cookie = createDraftSessionToken(id, undefined, secret); mocks.owner = null; mocks.staff = null;
    mocks.save.mockImplementation(async (_id, basics) => ({ ...mocks.card, ...basics }));
    mocks.pending.mockResolvedValue(null);
    mocks.requestEmail.mockResolvedValue({ limited: false, devAccessUrl: "http://localhost:3000/account/verify?token=test" });
    mocks.claim.mockResolvedValue({ id });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("saves an owned draft, requests confirmation and never writes an unverified owner email", async () => {
    const result = await updateCardBasicsAction(state, fields());
    expect(result).toMatchObject({ ok: true, fields: { organizerEmail: "new@example.com" }, accessEmail: { status: "sent" } });
    expect(mocks.save.mock.calls[0][1]).not.toHaveProperty("organizerEmail");
    expect(mocks.requestEmail).toHaveBeenCalledWith("new@example.com", { claimCardId: id, returnPath: `/manage/${id}` });
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("requires email in the basics form and avoids resending for every save", async () => {
    const invalid = fields(); invalid.set("organizerEmail", "");
    expect((await updateCardBasicsAction(state, invalid)).ok).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.pending.mockResolvedValue({ email: "new@example.com" });
    expect((await updateCardBasicsAction(state, fields())).ok).toBe(true);
    expect(mocks.requestEmail).not.toHaveBeenCalled();
  });

  it.each(["admin", "moderator"])("sends confirmation for the creator even with a %s session", async (role) => {
    mocks.staff = { email: `${role}@example.com`, role };
    const result = await updateCardBasicsAction(state, fields());
    expect(result).toMatchObject({ ok: true, fields: { organizerEmail: "new@example.com" }, accessEmail: { status: "sent" } });
    expect(mocks.save.mock.calls[0][1]).not.toHaveProperty("organizerEmail");
    expect(mocks.requestEmail).toHaveBeenCalledWith("new@example.com", { claimCardId: id, returnPath: `/manage/${id}` });
    expect(mocks.claim).not.toHaveBeenCalled();

    mocks.cookie = undefined;
    mocks.requestEmail.mockClear();
    const request = new FormData(); request.set("cardId", id); request.set("email", "new@example.com");
    expect((await requestCardAccessAction(state, request)).ok).toBe(false);
    expect(mocks.requestEmail).not.toHaveBeenCalled();
  });

  it("keeps the saved draft editable after an email delivery failure", async () => {
    mocks.requestEmail.mockRejectedValue(new Error("mail unavailable"));
    expect(await updateCardBasicsAction(state, fields())).toMatchObject({ ok: true, accessEmail: { status: "failed" } });
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("denies a copied URL or a changed card ID before saving or sending a claim email", async () => {
    mocks.cookie = undefined;
    expect((await updateCardBasicsAction(state, fields())).ok).toBe(false);
    const request = new FormData(); request.set("cardId", id); request.set("email", "attacker@example.com");
    expect((await requestCardAccessAction(state, request)).ok).toBe(false);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.requestEmail).not.toHaveBeenCalled();
    mocks.cookie = createDraftSessionToken("22222222-2222-4222-8222-222222222222", undefined, secret);
    expect((await updateCardBasicsAction(state, fields())).ok).toBe(false);
  });

  it("blocks collection, checkout, delivery and poll publication through server entry points", async () => {
    await expect(openCollectionAction(fields())).rejects.toMatchObject({ code: "unauthenticated" });
    expect((await deliverCardAction(state, fields())).ok).toBe(false);
    const poll = fields(); poll.set("pollId", "poll");
    expect((await openGiftPollAction(state, poll)).ok).toBe(false);
    const context = { params: Promise.resolve({ manageToken: id }) };
    expect((await checkout(new Request("http://localhost/api", { method: "POST" }), context)).status).toBe(403);
    expect((await openCollectionApi(new Request("http://localhost/api", { method: "POST" }), context)).status).toBe(403);
    expect(mocks.open).not.toHaveBeenCalled(); expect(mocks.pay).not.toHaveBeenCalled();
  });

  it("claims only after a valid email link and issues the ordinary organizer session", async () => {
    mocks.verify.mockResolvedValue({ email: "new@example.com", claimCardId: id, returnPath: `/manage/${id}` });
    const response = await verifyEmail(new Request("http://localhost/account/verify?token=valid"));
    expect(mocks.claim).toHaveBeenCalledWith(id, "new@example.com");
    expect(response.headers.get("set-cookie")).toContain("organizer_session=");
    mocks.card!.organizerEmail = "new@example.com";
    expect((await updateCardBasicsAction(state, fields())).ok).toBe(false);
    mocks.owner = { email: "new@example.com" };
    expect((await updateCardBasicsAction(state, fields())).ok).toBe(true);
  });

  it("does not replace an existing owner when claiming fails", async () => {
    mocks.verify.mockResolvedValue({ email: "new@example.com", claimCardId: id, returnPath: `/manage/${id}` });
    mocks.claim.mockResolvedValue(null);
    const response = await verifyEmail(new Request("http://localhost/account/verify?token=stale"));
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("location")).toContain("error=claim");
  });
});
