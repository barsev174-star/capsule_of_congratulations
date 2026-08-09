export type SupportRequestCategory = "problem" | "suggestion" | "question";
export type SupportRequestStatus = "new" | "in_progress" | "resolved";
export type SupportNotificationChannel = "email" | "telegram";
export type SupportNotificationStatus = "pending" | "sending" | "sent" | "failed";

export type SupportRequest = {
  id: string;
  category: SupportRequestCategory;
  contactName: string | null;
  email: string;
  message: string;
  source: string;
  status: SupportRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupportRequestInput = Pick<
  SupportRequest,
  "category" | "contactName" | "email" | "message" | "source"
>;

export type SupportNotificationDelivery = {
  id: string;
  supportRequestId: string;
  channel: SupportNotificationChannel;
  status: SupportNotificationStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lockedAt: string | null;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimedSupportNotification = SupportNotificationDelivery & {
  request: SupportRequest;
};
