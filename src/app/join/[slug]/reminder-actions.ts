"use server";

import { logger } from "@/lib/logger";
import { countRecentEventReminders, createEventReminder } from "@/lib/reminders/repository";
import { validateReminderRequest } from "@/lib/reminders/validation";

export type ReminderFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createReminderAction(
  _previousState: ReminderFormState,
  formData: FormData
): Promise<ReminderFormState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", message: "Готово. Мы напомним за 7 дней до события." };
  }

  const validation = validateReminderRequest(formData);
  if (!validation.ok) {
    return { status: "error", message: validation.message };
  }

  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (await countRecentEventReminders(validation.data.email, since) >= 3) {
    return {
      status: "error",
      message: "Для этого email уже создано несколько напоминаний. Попробуйте немного позже."
    };
  }

  const result = await createEventReminder(validation.data);
  logger.info("reminder.created", "Event reminder saved", {
    reminderId: result.reminder.id,
    eventDate: result.reminder.eventDate,
    created: result.created
  });

  return {
    status: "success",
    message: result.created
      ? "Готово. За 7 дней до события мы пришлём письмо на указанный email."
      : "Такое напоминание уже сохранено. Мы обязательно напишем за 7 дней."
  };
}
