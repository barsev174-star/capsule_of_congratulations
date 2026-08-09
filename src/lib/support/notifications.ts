import { logger } from "@/lib/logger";
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

export const getConfiguredSupportNotificationChannels = (): SupportNotificationChannel[] => [
  "email",
  ...(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_SUPPORT_CHAT_ID?.trim()
    ? ["telegram" as const]
    : [])
];

const sendSupportEmail = async (delivery: ClaimedSupportNotification) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = process.env.SUPPORT_NOTIFICATION_EMAIL?.trim() || "support@slovesto.ru";
  const ticket = delivery.request.id.slice(0, 8).toUpperCase();
  const category = categoryLabels[delivery.request.category];

  if (!apiKey || !from) {
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
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `support-request-${delivery.request.id}`,
      "User-Agent": "slovesto/1.0"
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: delivery.request.email,
      subject: `[Slovesto #${ticket}] ${category}`,
      html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.6;max-width:620px;margin:auto"><h1 style="font-family:Georgia,serif">Новое обращение #${ticket}</h1><p><strong>Тема:</strong> ${category}</p>${contactName}<p><strong>Email:</strong> ${escapeHtml(delivery.request.email)}</p><p><strong>Источник:</strong> ${escapeHtml(delivery.request.source)}</p><p><strong>Сообщение:</strong></p><div style="white-space:pre-wrap;padding:16px;background:#f7f2ed;border-radius:12px">${escapeHtml(delivery.request.message)}</div></div>`,
      text: `Новое обращение #${ticket}\nТема: ${category}\n${delivery.request.contactName ? `Имя: ${delivery.request.contactName}\n` : ""}Email: ${delivery.request.email}\nИсточник: ${delivery.request.source}\n\n${delivery.request.message}`
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 200)}`);
  }
};

const sendSupportTelegram = async (delivery: ClaimedSupportNotification) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_SUPPORT_CHAT_ID?.trim();
  if (!botToken || !chatId) throw new Error("Telegram support notifications are not configured");

  const ticket = delivery.request.id.slice(0, 8).toUpperCase();
  const contact = delivery.request.contactName
    ? `${escapeHtml(delivery.request.contactName)} · ${escapeHtml(delivery.request.email)}`
    : escapeHtml(delivery.request.email);
  const text = [
    `<b>Новое обращение #${ticket}</b>`,
    `<b>Тема:</b> ${categoryLabels[delivery.request.category]}`,
    `<b>Контакт:</b> ${contact}`,
    `<b>Источник:</b> ${escapeHtml(delivery.request.source)}`,
    "",
    escapeHtml(delivery.request.message)
  ].join("\n");
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", "User-Agent": "slovesto/1.0" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram returned ${response.status}: ${details.slice(0, 200)}`);
  }
};

export const sendSupportNotification = async (delivery: ClaimedSupportNotification) => {
  if (delivery.channel === "email") return sendSupportEmail(delivery);
  return sendSupportTelegram(delivery);
};
