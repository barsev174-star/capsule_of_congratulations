"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin/session";
import {
  updateAdminCardStatus,
  updateAdminContributionStatus,
  type ListAdminCardsOptions,
  type ListAdminContributionsOptions
} from "@/lib/admin/repository";
import type { CardDraft, Contribution } from "@/lib/cards/types";
import { logger } from "@/lib/logger";
import { setAiBonusLimit } from "@/lib/ai/repository";
import { getCardDraftById } from "@/lib/cards/repository";

const cardStatuses: CardDraft["status"][] = ["draft", "collecting", "ready", "closed"];
const contributionStatuses: Contribution["status"][] = ["visible", "hidden", "deleted"];

export async function updateCardStatusAdminAction(formData: FormData): Promise<void> {
  await requireAdminRole("moderator");

  const cardId = String(formData.get("cardId") ?? "");
  const status = String(formData.get("status") ?? "") as CardDraft["status"];

  if (!cardId || !cardStatuses.includes(status)) {
    return;
  }

  const updated = await updateAdminCardStatus(cardId, status);

  if (!updated) {
    return;
  }

  logger.info("admin.card_status_updated", "Card status updated by admin", {
    cardId: updated.id,
    status
  });

  revalidatePath("/admin/cards");
  revalidatePath(`/admin/cards/${updated.id}`);
}

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
