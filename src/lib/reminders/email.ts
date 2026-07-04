import { logger } from "@/lib/logger";
import type { EventReminder } from "./types";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character] ?? character);

export const sendEventReminderEmail = async (reminder: EventReminder) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const createUrl = `${siteUrl}/create`;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("reminder.email_dev", "Event reminder prepared", { reminderId: reminder.id });
      return;
    }
    throw new Error("Email provider is not configured");
  }

  const recipient = escapeHtml(reminder.recipientName);
  const occasion = escapeHtml(reminder.occasionText);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `event-reminder-${reminder.id}`,
      "User-Agent": "darislova/1.0"
    },
    body: JSON.stringify({
      from,
      to: [reminder.email],
      subject: `Через неделю — ${reminder.occasionText}`,
      html: `<div style="font-family:Arial,sans-serif;color:#38261f;line-height:1.6;max-width:560px;margin:auto"><h1 style="font-family:Georgia,serif">Пора готовить тёплые слова</h1><p>Через неделю — <strong>${occasion}</strong> для ${recipient}.</p><p>Можно уже сейчас создать открытку, пригласить близких и спокойно собрать поздравления.</p><p><a href="${createUrl}" style="display:inline-block;padding:13px 20px;background:#ed6431;color:white;text-decoration:none;border-radius:12px;font-weight:700">Создать открытку</a></p><p style="color:#7b6253;font-size:13px">Вы получили это письмо, потому что оставили напоминание на сайте «Дари слова».</p></div>`,
      text: `Через неделю — ${reminder.occasionText} для ${reminder.recipientName}. Создать открытку: ${createUrl}`
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider returned ${response.status}: ${details.slice(0, 200)}`);
  }
};
