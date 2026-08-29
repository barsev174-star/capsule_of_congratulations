import { logger } from "@/lib/logger";
import { hasConfiguredEmailTransport, sendTransactionalEmail } from "@/lib/email/transport";
import type {
  ClaimedSupportNotification,
  SupportNotificationChannel,
  SupportRequestCategory
} from "./types";

const categoryLabels: Record<SupportRequestCategory, string> = {
  problem: "Проблема",
  suggestion: "Предложение",
  question: "Вопрос"
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[character] ?? character);

export const getConfiguredSupportNotificationChannels = (): SupportNotificationChannel[] => ["email"];

const sendSupportEmail = async (delivery: ClaimedSupportNotification) => {
  const to = process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || "support@slovesto.ru";
  const ticket = delivery.request.id.slice(0, 8).toUpperCase();
  const category = categoryLabels[delivery.request.category];

  if (!hasConfiguredEmailTransport()) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("support.notification_email_dev", "Support notification email prepared", {
        requestId: delivery.request.id,
        deliveryId: delivery.id
      });
      return;
    }
    throw new Error("Email provider is not configured");
  }

  const contactName = delivery.request.contactName
    ? `<p><strong>Имя:</strong> ${escapeHtml(delivery.request.contactName)}</p>`
    : "";
  await sendTransactionalEmail({
    to,
    replyTo: delivery.request.email,
    idempotencyKey: `support-request-${delivery.request.id}`,
    subject: `[Slovesto #${ticket}] ${category}`,
    html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.6;max-width:620px;margin:auto"><h1 style="font-family:Georgia,serif">Новое обращение #${ticket}</h1><p><strong>Тема:</strong> ${category}</p>${contactName}<p><strong>Email:</strong> ${escapeHtml(delivery.request.email)}</p><p><strong>Источник:</strong> ${escapeHtml(delivery.request.source)}</p><p><strong>Сообщение:</strong></p><div style="white-space:pre-wrap;padding:16px;background:#f7f2ed;border-radius:12px">${escapeHtml(delivery.request.message)}</div></div>`,
    text: `Новое обращение #${ticket}\nТема: ${category}\n${delivery.request.contactName ? `Имя: ${delivery.request.contactName}\n` : ""}Email: ${delivery.request.email}\nИсточник: ${delivery.request.source}\n\n${delivery.request.message}`
  });
};

export const sendSupportNotification = async (delivery: ClaimedSupportNotification) => {
  return sendSupportEmail(delivery);
};
