import { createHash } from "node:crypto";
import type { CreateEventReminderInput } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = 24 * 60 * 60 * 1000;

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const normalizeDate = (date: Date) => date.toISOString().slice(0, 10);

export type ReminderValidationResult =
  | { ok: true; data: CreateEventReminderInput }
  | { ok: false; message: string };

export const getMinimumReminderEventDate = (now = new Date()) =>
  normalizeDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + 7 * dayMs));

export const validateReminderRequest = (formData: FormData, now = new Date()): ReminderValidationResult => {
  const recipientName = text(formData.get("recipientName"));
  const occasionText = text(formData.get("occasionText"));
  const eventDate = text(formData.get("eventDate"));
  const email = text(formData.get("email")).toLowerCase();
  const consent = text(formData.get("consent"));
  const sourceCardId = text(formData.get("sourceCardId")) || null;

  if (recipientName.length < 2 || recipientName.length > 100) {
    return { ok: false, message: "Укажите, кого поздравить — от 2 до 100 символов." };
  }

  if (occasionText.length < 2 || occasionText.length > 80) {
    return { ok: false, message: "Укажите повод — от 2 до 80 символов." };
  }

  if (!datePattern.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00.000Z`))) {
    return { ok: false, message: "Выберите корректную дату события." };
  }

  const minimumDate = getMinimumReminderEventDate(now);
  if (eventDate < minimumDate) {
    return { ok: false, message: "Выберите дату не раньше чем через 7 дней, чтобы мы успели напомнить заранее." };
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return { ok: false, message: "Введите корректный email для напоминания." };
  }

  if (consent !== "on") {
    return { ok: false, message: "Подтвердите согласие получить одно письмо-напоминание." };
  }

  const remindOn = normalizeDate(new Date(Date.parse(`${eventDate}T00:00:00.000Z`) - 7 * dayMs));
  const dedupeKey = createHash("sha256")
    .update([email, eventDate, recipientName.toLowerCase(), occasionText.toLowerCase()].join("|"))
    .digest("hex");

  return {
    ok: true,
    data: { recipientName, occasionText, eventDate, remindOn, email, sourceCardId, dedupeKey }
  };
};
