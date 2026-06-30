"use server";

import { redirect } from "next/navigation";
import { getCardDraftByManageToken, updateCardPaymentStatus, updateCardStatus } from "@/lib/cards/repository";
import { isGiftPublished } from "@/lib/cards/status";
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

  if (!isGiftPublished(card)) {
    await updateCardStatus(card.id, "published");
    await updateCardPaymentStatus(card.id, "paid");

    logger.info("card.published", "Card published via mock action", {
      cardId: card.id,
      manageToken: card.manageToken
    });
  }

  redirect(getGiftPath(card.finalSlug));
}
