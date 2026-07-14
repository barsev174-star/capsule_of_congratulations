import { logger } from "@/lib/logger";
import type { EventReminder } from "./types";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character] ?? character);

const getEmailConfig = () => ({
  apiKey: process.env.RESEND_API_KEY?.trim(),
  from: process.env.EMAIL_FROM?.trim(),
  replyTo: process.env.EMAIL_REPLY_TO?.trim(),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "")
});

const getEmailLogoUrl = (siteUrl: string) => `${siteUrl}/brand/email-logo.png`;

const deliverEmail = async (input: {
  reminder: EventReminder;
  idempotencyKey: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const { apiKey, from, replyTo } = getEmailConfig();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("reminder.email_dev", "Event reminder email prepared", {
        reminderId: input.reminder.id,
        delivery: input.idempotencyKey
      });
      return;
    }
    throw new Error("Email provider is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
      "User-Agent": "slovesto/1.0"
    },
    body: JSON.stringify({
      from,
      to: [input.reminder.email],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 200)}`);
  }
};

export const sendEventReminderConfirmationEmail = async (reminder: EventReminder, cancellationToken: string) => {
  const { siteUrl } = getEmailConfig();
  const emailLogoUrl = getEmailLogoUrl(siteUrl);
  const recipient = escapeHtml(reminder.recipientName);
  const occasion = escapeHtml(reminder.occasionText);
  const createUrl = `${siteUrl}/create`;
  const hasScheduledReminder = reminder.schedule !== "confirmation_only";
  const cancelUrl = `${siteUrl}/reminders/cancel/${encodeURIComponent(cancellationToken)}`;
  const scheduleText = reminder.schedule === "seven_days_before"
    ? "За 7 дней до события пришлём письмо, чтобы вы успели собрать открытку от всех."
    : reminder.schedule === "next_day"
      ? "Событие уже скоро, поэтому напомним ещё раз завтра утром."
      : "Отдельное напоминание отправлять не будем — лучше начать собирать открытку сейчас.";
  const cancellationHtml = hasScheduledReminder
    ? `<p>Если планы изменятся, <a href="${cancelUrl}" style="color:#d95828">напоминание можно отменить</a>.</p>`
    : "";
  const cancellationText = hasScheduledReminder ? `\n\nЕсли планы изменятся, напоминание можно отменить:\n${cancelUrl}` : "";

  await deliverEmail({
    reminder,
    idempotencyKey: `event-reminder-confirmation-${reminder.id}`,
    subject: `Напоминание сохранено — ${reminder.occasionText}`,
    html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.65;max-width:560px;margin:auto"><img src="${emailLogoUrl}" width="180" alt="Slovesto" style="display:block;width:180px;height:auto;margin:0 0 20px"><h1 style="font-family:Georgia,serif">Напоминание сохранено</h1><p>Мы сохранили напоминание о событии: <strong>${occasion}</strong> для ${recipient}.</p><p>${scheduleText}</p>${cancellationHtml}<p><a href="${createUrl}" style="display:inline-block;padding:13px 20px;background:#ed6431;color:white;text-decoration:none;border-radius:12px;font-weight:700">Создать открытку сейчас</a></p></div>`,
    text: `Мы сохранили напоминание о событии: ${reminder.occasionText} для ${reminder.recipientName}.\n\n${scheduleText}${cancellationText}\n\nСоздать открытку сейчас: ${createUrl}`
  });
};

export const sendEventReminderEmail = async (reminder: EventReminder) => {
  const { siteUrl } = getEmailConfig();
  const emailLogoUrl = getEmailLogoUrl(siteUrl);
  const createUrl = `${siteUrl}/create`;

  const recipient = escapeHtml(reminder.recipientName);
  const occasion = escapeHtml(reminder.occasionText);
  const timingText = reminder.schedule === "seven_days_before"
    ? `Через 7 дней — <strong>${occasion}</strong>.`
    : `Событие уже скоро — <strong>${occasion}</strong>.`;
  const timingPlainText = reminder.schedule === "seven_days_before"
    ? `Через 7 дней — ${reminder.occasionText}.`
    : `Событие уже скоро — ${reminder.occasionText}.`;
  await deliverEmail({
    reminder,
    idempotencyKey: `event-reminder-${reminder.id}`,
    subject: `Пора собрать открытку: ${reminder.recipientName}`,
    html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.65;max-width:560px;margin:auto"><img src="${emailLogoUrl}" width="180" alt="Slovesto" style="display:block;width:180px;height:auto;margin:0 0 20px"><h1 style="font-family:Georgia,serif">Пора собрать открытку: ${recipient}</h1><p>${timingText}</p><p>Самое время собрать открытку от всех: добавить тёплые слова, фото и отправить красивую ссылку получателю.</p><p><a href="${createUrl}" style="display:inline-block;padding:13px 20px;background:#ed6431;color:white;text-decoration:none;border-radius:12px;font-weight:700">Собрать открытку</a></p></div>`,
    text: `${timingPlainText}\n\nСамое время собрать открытку от всех: добавить тёплые слова, фото и отправить красивую ссылку получателю.\n\nСобрать открытку: ${createUrl}`
  });
};
