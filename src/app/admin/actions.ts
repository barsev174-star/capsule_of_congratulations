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

export type AdminCardsSearchOptions = ListAdminCardsOptions;
export type AdminContributionsSearchOptions = ListAdminContributionsOptions;
