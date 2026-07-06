"use server";

import { redirect } from "next/navigation";
import { getCardDraftByManageToken, updateCardStatus } from "@/lib/cards/repository";
import { getPublicationMode, isGiftPublished } from "@/lib/cards/status";
import { getGiftPath } from "@/lib/routes/card-links";
import { reportCriticalError, trackFunnel } from "@/lib/telemetry";

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
    try {
      await updateCardStatus(card.id, "published");
    } catch (error) {
      const errorId = await reportCriticalError("publication", error, { cardId: card.id });
      throw new Error(`Не удалось опубликовать открытку. Код ошибки: ${errorId}`);
    }

    await trackFunnel("funnel.card_published", {
      cardId: card.id,
      publicationMode
    });
  }

  redirect(getGiftPath(card.finalSlug));
}
