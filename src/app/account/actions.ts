"use server";

import { redirect } from "next/navigation";
import { clearOrganizerSession } from "@/lib/organizer/session";
import { requestOrganizerAccess } from "@/lib/organizer/service";
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
    logger.error("organizer.access_request_failed", "Organizer access request failed", {
      error: details
    });
    if (process.env.NODE_ENV !== "production" && details.includes("verify a domain")) {
      return {
        status: "error",
        message: "Resend пока работает в тестовом режиме. Подтвердите домен отправителя, чтобы писать на любые адреса."
      };
    }
    return { status: "error", message: "Не удалось отправить письмо. Попробуйте немного позже." };
  }
}

export async function logoutOrganizerAction(): Promise<void> {
  await clearOrganizerSession();
  redirect("/");
}
