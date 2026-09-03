import type { AdminUserRole } from "@/lib/admin/types";
import { getAdminSession } from "@/lib/admin/session";
import { getCardDraftByManagementId } from "@/lib/cards/repository";
import type { CardDraft } from "@/lib/cards/types";
import { normalizeOrganizerEmail } from "@/lib/organizer/email-normalization";
import { getOrganizerSession } from "@/lib/organizer/session";
import { hasGuestDraftAccess } from "./draft-session";

export type CardManagementActor =
  | { kind: "guest-draft" }
  | { kind: "organizer"; email: string }
  | { kind: "staff"; email: string; role: "admin" | "moderator" };

export type CardManagementAccess =
  | { allowed: true; actor: CardManagementActor }
  | {
      allowed: false;
      reason: "unauthenticated" | "wrong-organizer" | "staff-role-denied";
      currentEmail: string | null;
    };

export class CardManagementAccessError extends Error {
  constructor(
    public readonly code: "not-found" | "unauthenticated" | "forbidden"
  ) {
    super(code === "not-found" ? "Card not found" : code === "unauthenticated" ? "Unauthorized" : "Forbidden");
    this.name = "CardManagementAccessError";
  }
}

const isManagementStaffRole = (role: AdminUserRole): role is "admin" | "moderator" =>
  role === "admin" || role === "moderator";

export const getCardManagementAccess = async (card: CardDraft, options: { allowGuestDraft?: boolean } = {}): Promise<CardManagementAccess> => {
  const [organizerSession, adminSession] = await Promise.all([
    getOrganizerSession(),
    getAdminSession()
  ]);
  const ownerEmail = normalizeOrganizerEmail(card.organizerEmail);
  const organizerEmail = normalizeOrganizerEmail(organizerSession?.email);

  if (ownerEmail && organizerEmail && organizerEmail === ownerEmail) {
    return { allowed: true, actor: { kind: "organizer", email: organizerEmail } };
  }

  if (adminSession && !isManagementStaffRole(adminSession.role)) {
    return {
      allowed: false,
      reason: "staff-role-denied",
      currentEmail: adminSession.email
    };
  }

  // Prefer the creator's scoped draft grant even if they are also signed into admin.
  // Opt-in for editing only. Collection, payment and ownership endpoints keep the default.
  if (options.allowGuestDraft && await hasGuestDraftAccess(card)) {
    return { allowed: true, actor: { kind: "guest-draft" } };
  }

  if (adminSession && isManagementStaffRole(adminSession.role)) {
    return {
      allowed: true,
      actor: { kind: "staff", email: adminSession.email, role: adminSession.role }
    };
  }

  if (organizerSession) {
    return {
      allowed: false,
      reason: "wrong-organizer",
      currentEmail: organizerEmail
    };
  }

  return { allowed: false, reason: "unauthenticated", currentEmail: null };
};

export const requireCardManagementAccess = async (cardId: string, options: { allowGuestDraft?: boolean } = {}) => {
  const card = await getCardDraftByManagementId(cardId);
  if (!card) throw new CardManagementAccessError("not-found");
  const access = await getCardManagementAccess(card, options);
  if (!access.allowed) {
    throw new CardManagementAccessError(access.reason === "unauthenticated" ? "unauthenticated" : "forbidden");
  }
  return { card, actor: access.actor };
};

export const requireCardOrganizer = async (cardId: string) => {
  const result = await requireCardManagementAccess(cardId);
  if (result.actor.kind !== "organizer") throw new CardManagementAccessError("forbidden");
  return result;
};
