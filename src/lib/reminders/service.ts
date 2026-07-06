import { logger } from "@/lib/logger";
import { sendEventReminderEmail } from "./email";
import { claimDueEventReminders, completeEventReminder, releaseEventReminder } from "./repository";
import { reportCriticalError } from "@/lib/telemetry";

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
      await reportCriticalError("email", error, { reminderId: reminder.id, operation: "event_reminder" });
    }
  }
  logger.info("reminder.batch_complete", "Event reminder batch completed", {
    claimed: reminders.length, sent, failed
  });
  return { claimed: reminders.length, sent, failed };
};
