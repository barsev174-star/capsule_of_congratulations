import { createHash } from "node:crypto";
import type { CreateEventReminderInput } from "./types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = 24 * 60 * 60 * 1000;
const reminderTimeZone = process.env.REMINDER_TIME_ZONE?.trim() || "Asia/Yekaterinburg";

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const normalizeDate = (date: Date) => date.toISOString().slice(0, 10);
export const getReminderCalendarDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: reminderTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};
const calendarDateTime = (date: Date) => Date.parse(`${getReminderCalendarDate(date)}T00:00:00.000Z`);

export type ReminderValidationResult =
  | { ok: true; data: CreateEventReminderInput }
  | { ok: false; message: string };

export const getMinimumReminderEventDate = (now = new Date()) =>
  normalizeDate(new Date(calendarDateTime(now) + dayMs));

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
    return { ok: false, message: "Выберите будущую дату — начиная с завтрашнего дня." };
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return { ok: false, message: "Введите корректный email для напоминания." };
  }

  if (consent !== "on") {
    return { ok: false, message: "Разрешите отправить подтверждение и, если позволяет дата, одно напоминание." };
  }

  const eventTime = Date.parse(`${eventDate}T00:00:00.000Z`);
  const daysUntilEvent = Math.round((eventTime - calendarDateTime(now)) / dayMs);
  const schedule = daysUntilEvent >= 8
    ? "seven_days_before" as const
    : daysUntilEvent >= 3
      ? "next_day" as const
      : "confirmation_only" as const;
  const remindOn = schedule === "seven_days_before"
    ? normalizeDate(new Date(eventTime - 7 * dayMs))
    : schedule === "next_day"
      ? normalizeDate(new Date(calendarDateTime(now) + dayMs))
      : null;
  const dedupeKey = createHash("sha256")
    .update([email, eventDate, recipientName.toLowerCase(), occasionText.toLowerCase()].join("|"))
    .digest("hex");

  return {
    ok: true,
    data: { recipientName, occasionText, eventDate, remindOn, schedule, email, sourceCardId, dedupeKey }
  };
};
