import type { LogContext } from "@/lib/logger";

export type CriticalAlertChannel = "email" | "telegram";
export type CriticalAlertStatus = "pending" | "sending" | "sent" | "failed";

export type CriticalAlertDelivery = {
  id: string;
  errorId: string;
  event: string;
  fingerprint: string;
  channel: CriticalAlertChannel;
  context: LogContext;
  status: CriticalAlertStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lockedAt: string | null;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
