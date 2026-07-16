"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin/session";
import {
  updateAdminContributionStatus,
  type ListAdminCardsOptions,
  type ListAdminContributionsOptions
} from "@/lib/admin/repository";
import type { Contribution } from "@/lib/cards/types";
import { logger } from "@/lib/logger";
import { setAiBonusLimit } from "@/lib/ai/repository";
import { getCardDraftById } from "@/lib/cards/repository";
import { accessGrantReasons, grantCardAccess, revokeCardAccess } from "@/lib/cards/access-grants";

const contributionStatuses: Contribution["status"][] = ["visible", "hidden", "deleted"];

export async function updateContributionStatusAdminAction(formData: FormData): Promise<void> {
  await requireAdminRole("support");

  const contributionId = String(formData.get("contributionId") ?? "");
  const status = String(formData.get("status") ?? "") as Contribution["status"];

  if (!contributionId || !contributionStatuses.includes(status)) {
    return;
  }

  const updated = await updateAdminContributionStatus(contributionId, status);

  if (!updated) {
    return;
  }

  logger.info("admin.contribution_status_updated", "Contribution status updated by admin", {
    contributionId: updated.id,
    status
  });

  revalidatePath("/admin/contributions");
}

export async function updateAiBonusLimitAdminAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const cardId = String(formData.get("cardId") ?? "");
  const bonusLimit = Number(formData.get("bonusLimit"));
  if (!cardId || !Number.isFinite(bonusLimit)) return;

  const card = await getCardDraftById(cardId);
  if (!card) return;

  const savedBonus = await setAiBonusLimit(cardId, bonusLimit);
  logger.info("admin.ai_bonus_limit_updated", "AI bonus limit updated by admin", {
    cardId,
    bonusLimit: savedBonus
  });

  revalidatePath(`/admin/cards/${cardId}`);
  revalidatePath(`/manage/${card.manageToken}`);
}

export type AdminCardsSearchOptions = ListAdminCardsOptions;
export type AdminContributionsSearchOptions = ListAdminContributionsOptions;

export async function grantCardAccessAdminAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole("admin");
  const cardId = String(formData.get("cardId") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const duration = String(formData.get("duration") ?? "QA_30_DAYS");
  const expiresAtValue = String(formData.get("expiresAt") ?? "").trim();
  if (!cardId || !accessGrantReasons.includes(reasonCode as typeof accessGrantReasons[number]) || comment.length < 3 || comment.length > 1000) return;
  if (duration === "UNTIL_DATE" && (!expiresAtValue || Number.isNaN(Date.parse(expiresAtValue)))) return;
  const expiresAt = duration === "PERMANENT" ? null : duration === "UNTIL_DATE" ? new Date(expiresAtValue).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await grantCardAccess({ cardId, adminEmail: session.email, reasonCode: reasonCode as typeof accessGrantReasons[number], comment, expiresAt });
  revalidatePath(`/admin/cards/${cardId}`);
  const card = await getCardDraftById(cardId);
  if (card) revalidatePath(`/manage/${card.manageToken}`);
}

export async function revokeCardAccessAdminAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole("admin");
  const cardId = String(formData.get("cardId") ?? "");
  const grantId = String(formData.get("grantId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!cardId || !grantId || comment.length < 3 || comment.length > 1000) return;
  await revokeCardAccess({ cardId, grantId, adminEmail: session.email, comment });
  revalidatePath(`/admin/cards/${cardId}`);
  const card = await getCardDraftById(cardId);
  if (card) revalidatePath(`/manage/${card.manageToken}`);
}
