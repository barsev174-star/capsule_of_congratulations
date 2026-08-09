"use server";

import { countRecentSupportRequests, createSupportRequest } from "@/lib/support/repository";
import { getConfiguredSupportNotificationChannels } from "@/lib/support/notifications";
import { runSupportNotificationBatch } from "@/lib/support/notifications-service";
import { validateSupportRequest } from "@/lib/support/validation";
import { logger } from "@/lib/logger";

export type SupportFormState = {
  status: "idle" | "success" | "error";
  message: string;
  ticket?: string;
};

export async function submitSupportRequestAction(
  _previousState: SupportFormState,
  formData: FormData
): Promise<SupportFormState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", message: "Спасибо! Обращение принято." };
  }

  const validation = validateSupportRequest(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (await countRecentSupportRequests(validation.data.email, since) >= 3) {
    return {
      status: "error",
      message: "За последний час уже отправлено несколько обращений. Попробуйте немного позже."
    };
  }

  const request = await createSupportRequest(
    validation.data,
    getConfiguredSupportNotificationChannels()
  );
  const ticket = request.id.slice(0, 8).toUpperCase();

  logger.info("support.request_created", "Support request created", {
    requestId: request.id,
    category: request.category,
    source: request.source
  });

  try {
    await runSupportNotificationBatch({ requestId: request.id });
  } catch (error) {
    logger.error("support.notification_dispatch_failed", "Support notification dispatch could not start", {
      requestId: request.id,
      errorType: error instanceof Error ? error.name : "UnknownError"
    });
  }

  return {
    status: "success",
    message: "Спасибо! Мы получили сообщение и ответим на указанный email.",
    ticket
  };
}
