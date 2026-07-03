"use server";

import { redirect } from "next/navigation";
import { getCardDraftByManageToken, updateCardStatus } from "@/lib/cards/repository";
import { getPublicationMode, isGiftPublished } from "@/lib/cards/status";
import { logger } from "@/lib/logger";
import { getGiftPath } from "@/lib/routes/card-links";

export async function publishCardAction(formData: FormData): Promise<void> {
  const manageToken = String(formData.get("manageToken") ?? "");

  if (!manageToken) {
    throw new Error("Missing manage token");
  }

  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    throw new Error("Card not found");
  }

  const publicationMode = getPublicationMode();

  if (!isGiftPublished(card) && publicationMode === "paid") {
    throw new Error("Paid publication is not configured yet");
  }

  if (!isGiftPublished(card)) {
    await updateCardStatus(card.id, "published");

    logger.info("card.published", "Card published during free beta", {
      cardId: card.id,
      publicationMode
    });
  }

  redirect(getGiftPath(card.finalSlug));
}
