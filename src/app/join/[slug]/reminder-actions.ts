"use server";

import { logger } from "@/lib/logger";
import { reportCriticalError } from "@/lib/telemetry";
import { sendEventReminderConfirmationEmail } from "@/lib/reminders/email";
import {
  countRecentEventReminders,
  createEventReminder,
  markEventReminderConfirmationSent
} from "@/lib/reminders/repository";
import type { EventReminderSchedule } from "@/lib/reminders/types";
import { validateReminderRequest } from "@/lib/reminders/validation";

export type ReminderFormState = {
  status: "idle" | "success" | "warning" | "error";
  title: string;
  lines: string[];
  schedule: EventReminderSchedule | null;
};

const responseForSchedule = (schedule: EventReminderSchedule): Omit<ReminderFormState, "status"> => {
  if (schedule === "seven_days_before") {
    return {
      title: "Готово — мы сохранили напоминание.",
      lines: [
        "Сейчас отправим письмо с деталями и ссылкой отмены.",
        "За 7 дней до события напомним собрать открытку."
      ],
      schedule
    };
  }
  if (schedule === "next_day") {
    return {
      title: "Готово — мы сохранили напоминание.",
      lines: [
        "Событие уже скоро, поэтому сейчас отправим письмо с деталями и ссылкой отмены.",
        "Лучше начать собирать открытку уже сейчас — так участники успеют добавить поздравления.",
        "Мы также напомним ближе к событию."
      ],
      schedule
    };
  }
  return {
    title: "Готово — мы отправим письмо с деталями.",
    lines: [
      "Событие совсем скоро. Напоминание уже не поможет выиграть много времени, поэтому лучше сразу начать собирать открытку.",
      "Так вы сможете сразу отправить ссылку участникам."
    ],
    schedule
  };
};

export async function createReminderAction(
  _previousState: ReminderFormState,
  formData: FormData
): Promise<ReminderFormState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "success", title: "Готово — мы сохранили напоминание.", lines: [], schedule: null };
  }

  const validation = validateReminderRequest(formData);
  if (!validation.ok) {
    return { status: "error", title: validation.message, lines: [], schedule: null };
  }

  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    if (await countRecentEventReminders(validation.data.email, since) >= 3) {
      return {
        status: "error",
        title: "Для этого email уже создано несколько напоминаний.",
        lines: ["Попробуйте немного позже."],
        schedule: null
      };
    }

    const result = await createEventReminder(validation.data);
    logger.info("reminder.created", "Event reminder saved", {
      reminderId: result.reminder.id,
      eventDate: result.reminder.eventDate,
      created: result.created
    });

    const response = responseForSchedule(result.reminder.schedule);
    if (!result.cancellationToken) {
      return {
        status: "success",
        title: "Такое напоминание уже сохранено.",
        lines: result.reminder.schedule === "confirmation_only"
          ? ["Дополнительное письмо для этого события не запланировано."]
          : ["Подтверждение уже отправлено на указанный email."],
        schedule: result.reminder.schedule
      };
    }

    try {
      await sendEventReminderConfirmationEmail(result.reminder, result.cancellationToken);
      await markEventReminderConfirmationSent(result.reminder.id);
      return { status: "success", ...response };
    } catch (error) {
      await reportCriticalError("email", error, {
        reminderId: result.reminder.id,
        operation: "event_reminder_confirmation"
      });
      return {
        status: "warning",
        title: "Напоминание сохранено, но письмо пока не отправлено.",
        lines: ["Попробуйте отправить форму ещё раз чуть позже — мы не создадим дубликат."],
        schedule: result.reminder.schedule
      };
    }
  } catch (error) {
    const errorId = await reportCriticalError("database", error, { operation: "event_reminder_create" });
    return {
      status: "error",
      title: "Не удалось сохранить напоминание.",
      lines: [`Попробуйте ещё раз. Если ошибка повторится, сообщите поддержке код ${errorId}.`],
      schedule: null
    };
  }
}
