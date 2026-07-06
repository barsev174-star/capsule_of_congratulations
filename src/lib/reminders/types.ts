export type EventReminderStatus = "pending" | "sending" | "sent" | "cancelled" | "failed";
export type EventReminderSchedule = "seven_days_before" | "next_day" | "confirmation_only";

export type EventReminder = {
  id: string;
  recipientName: string;
  occasionText: string;
  eventDate: string;
  remindOn: string | null;
  schedule: EventReminderSchedule;
  email: string;
  sourceCardId: string | null;
  dedupeKey: string;
  cancellationTokenHash: string | null;
  confirmationSentAt: string | null;
  attemptCount: number;
  lockedAt: string | null;
  status: EventReminderStatus;
  sentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventReminderInput = Pick<
  EventReminder,
  | "recipientName"
  | "occasionText"
  | "eventDate"
  | "remindOn"
  | "schedule"
  | "email"
  | "sourceCardId"
  | "dedupeKey"
>;

export type EventReminderCancellationState = "cancellable" | "cancelled" | "sent" | "not_found";
