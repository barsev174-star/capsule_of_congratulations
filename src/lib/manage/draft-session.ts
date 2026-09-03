import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getOrganizerSessionSecret } from "@/lib/organizer/auth";
import type { CardDraft } from "@/lib/cards/types";

export const DRAFT_SESSION_COOKIE = "slv_draft_session";
export const DRAFT_SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const MAX_DRAFTS = 10;
const cardIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type DraftGrant = { cardId: string; exp: number };
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(`slovesto:draft-session:v1:${payload}`).digest();

export const readDraftGrants = (token: string | undefined, secret: string, now = Date.now()): DraftGrant[] => {
  try {
    if (!token || token.length > 3_000) return [];
    const parts = token.split(".");
    if (parts.length !== 2) return [];
    const [payload, mac] = parts;
    const expected = signature(payload, secret);
    const received = Buffer.from(mac, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) return [];
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed?.version !== 1 || !Array.isArray(parsed.grants) || parsed.grants.length > MAX_DRAFTS) return [];
    return parsed.grants.filter((grant: DraftGrant) => grant && typeof grant.cardId === "string"
      && cardIdPattern.test(grant.cardId) && Number.isSafeInteger(grant.exp)
      && grant.exp > Math.floor(now / 1000) && grant.exp <= Math.floor(now / 1000) + DRAFT_SESSION_MAX_AGE);
  } catch { return []; }
};

export const createDraftSessionToken = (cardId: string, previous: string | undefined, secret: string, now = Date.now()) => {
  if (!cardIdPattern.test(cardId)) throw new Error("Invalid draft identifier");
  const grants = readDraftGrants(previous, secret, now).filter((grant) => grant.cardId !== cardId).slice(-(MAX_DRAFTS - 1));
  grants.push({ cardId, exp: Math.floor(now / 1000) + DRAFT_SESSION_MAX_AGE });
  const payload = Buffer.from(JSON.stringify({ version: 1, grants })).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
};

export const isUnclaimedEditableDraft = (card: CardDraft) =>
  !card.organizerEmail.trim() && card.collectionStatus === "DRAFT" && card.paymentStatus === "UNPAID"
  && card.deliveryStatus === "PREPARING" && !card.collectionOpenedAt && !card.deliveredAt && !card.paidAt
  && !card.activePaidOrderId && !card.activeAccessGrantId && !card.isHidden && !card.deletedAt && !card.purgedAt;

export const hasGuestDraftAccess = async (card: CardDraft) => {
  if (!isUnclaimedEditableDraft(card)) return false;
  const store = await cookies();
  return readDraftGrants(store.get(DRAFT_SESSION_COOKIE)?.value, getOrganizerSessionSecret())
    .some((grant) => grant.cardId === card.id);
};

// Called only with the result of server-side creation, never with a client-supplied ID.
export const grantNewDraftAccess = async (cardId: string) => {
  const store = await cookies();
  store.set(DRAFT_SESSION_COOKIE, createDraftSessionToken(cardId, store.get(DRAFT_SESSION_COOKIE)?.value, getOrganizerSessionSecret()), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DRAFT_SESSION_MAX_AGE
  });
};
