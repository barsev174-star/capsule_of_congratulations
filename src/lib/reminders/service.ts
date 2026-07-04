import { logger } from "@/lib/logger";
import { sendEventReminderEmail } from "./email";
import { claimDueEventReminders, completeEventReminder, releaseEventReminder } from "./repository";

type ReminderBatchDependencies = {
  claim: typeof claimDueEventReminders;
  send: typeof sendEventReminderEmail;
  complete: typeof completeEventReminder;
  release: typeof releaseEventReminder;
};

const defaultDependencies: ReminderBatchDependencies = {
  claim: claimDueEventReminders, send: sendEventReminderEmail,
  complete: completeEventReminder, release: releaseEventReminder
};

export const runEventReminderBatch = async (
  today = new Date().toISOString().slice(0, 10),
  dependencies: ReminderBatchDependencies = defaultDependencies
) => {
  const reminders = await dependencies.claim(today, 50);
  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    try {
      await dependencies.send(reminder);
      await dependencies.complete(reminder.id);
      sent += 1;
    } catch (error) {
      await dependencies.release(reminder.id);
      failed += 1;
      logger.error("reminder.send_failed", "Event reminder delivery failed", {
        reminderId: reminder.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  logger.info("reminder.batch_complete", "Event reminder batch completed", {
    claimed: reminders.length, sent, failed
  });
  return { claimed: reminders.length, sent, failed };
};
