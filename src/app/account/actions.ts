"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearOrganizerSession } from "@/lib/organizer/session";
import { getOrganizerSession } from "@/lib/organizer/session";
import { requestOrganizerAccess } from "@/lib/organizer/service";
import { reportCriticalError } from "@/lib/telemetry";
import { getCardDraftById, restoreDeletedCard, softDeleteCard } from "@/lib/cards/repository";
import { logger } from "@/lib/logger";

export type AccountLoginState = {
  status: "idle" | "success" | "error";
  message: string;
  devAccessUrl?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestAccountAccessAction(
  _previous: AccountLoginState,
  formData: FormData
): Promise<AccountLoginState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", message: "Если email указан верно, ссылка уже в пути." };
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) {
    return { status: "error", message: "Введите корректный email." };
  }

  try {
    const result = await requestOrganizerAccess(email);
    if (result.limited) {
      return { status: "error", message: "Ссылку уже отправляли несколько раз. Попробуйте через час." };
    }
    return {
      status: "success",
      message: "Отправили ссылку для входа. Она действует 15 минут.",
      devAccessUrl: result.devAccessUrl
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const errorId = await reportCriticalError("email", error, { operation: "organizer_access" });
    if (process.env.NODE_ENV !== "production" && details.includes("verify a domain")) {
      return {
        status: "error",
        message: "Resend пока работает в тестовом режиме. Подтвердите домен отправителя, чтобы писать на любые адреса."
      };
    }
    return { status: "error", message: `Не удалось отправить письмо. Код ошибки: ${errorId}` };
  }
}

export async function logoutOrganizerAction(): Promise<void> {
  await clearOrganizerSession();
  redirect("/");
}

const getOwnedCard = async (cardId: string) => {
  const session = await getOrganizerSession();
  if (!session) return null;
  const card = await getCardDraftById(cardId);
  return card?.organizerEmail.trim().toLowerCase() === session.email.trim().toLowerCase() ? card : null;
};

export async function deleteOrganizerCardAction(formData: FormData) {
  const cardId = String(formData.get("cardId") ?? "");
  const card = await getOwnedCard(cardId);
  if (!card || card.deletedAt) return;
  const deleted = await softDeleteCard(card.id);
  if (deleted) logger.info("card.soft_deleted", "Card hidden pending deletion", { cardId: card.id });
  revalidatePath("/account");
}

export async function restoreOrganizerCardAction(formData: FormData) {
  const cardId = String(formData.get("cardId") ?? "");
  const card = await getOwnedCard(cardId);
  if (!card?.deletedAt) return;
  const restored = await restoreDeletedCard(card.id);
  if (restored) logger.info("card.restored", "Card restored during recovery window", { cardId: card.id });
  revalidatePath("/account");
}
