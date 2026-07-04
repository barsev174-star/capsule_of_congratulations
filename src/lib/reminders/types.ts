export type EventReminderStatus = "pending" | "sending" | "sent" | "cancelled";

export type EventReminder = {
  id: string;
  recipientName: string;
  occasionText: string;
  eventDate: string;
  remindOn: string;
  email: string;
  sourceCardId: string | null;
  dedupeKey: string;
  status: EventReminderStatus;
  sentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventReminderInput = Pick<
  EventReminder,
  "recipientName" | "occasionText" | "eventDate" | "remindOn" | "email" | "sourceCardId" | "dedupeKey"
>;
