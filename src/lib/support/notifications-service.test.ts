import { describe, expect, it, vi } from "vitest";
import { runSupportNotificationBatch } from "./notifications-service";
import type { ClaimedSupportNotification } from "./types";

vi.mock("@/lib/telemetry", () => ({ reportCriticalError: vi.fn().mockResolvedValue("error-id") }));

const delivery: ClaimedSupportNotification = {
  id: "delivery-1",
  supportRequestId: "11111111-1111-4111-8111-111111111111",
  channel: "email",
  status: "sending",
  attemptCount: 1,
  nextAttemptAt: "2026-08-09T00:00:00.000Z",
  lockedAt: "2026-08-09T00:00:00.000Z",
  lastError: null,
  sentAt: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:00:00.000Z",
  request: {
    id: "11111111-1111-4111-8111-111111111111",
    category: "question",
    contactName: "Анна",
    email: "anna@example.com",
    message: "Как открыть открытку?",
    source: "support_page",
    status: "new",
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z"
  }
};

describe("runSupportNotificationBatch", () => {
  it("marks each successful delivery as sent", async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const fail = vi.fn().mockResolvedValue(undefined);
    const result = await runSupportNotificationBatch({}, {
      claim: vi.fn().mockResolvedValue([delivery]),
      send: vi.fn().mockResolvedValue(undefined),
      complete,
      fail
    });

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(complete).toHaveBeenCalledWith(delivery.id);
    expect(fail).not.toHaveBeenCalled();
  });

  it("records a failed delivery without stopping the batch", async () => {
    const error = new Error("Provider unavailable");
    const complete = vi.fn().mockResolvedValue(undefined);
    const fail = vi.fn().mockResolvedValue(undefined);
    const result = await runSupportNotificationBatch({}, {
      claim: vi.fn().mockResolvedValue([delivery]),
      send: vi.fn().mockRejectedValue(error),
      complete,
      fail
    });

    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(fail).toHaveBeenCalledWith(delivery.id, error);
    expect(complete).not.toHaveBeenCalled();
  });
});
