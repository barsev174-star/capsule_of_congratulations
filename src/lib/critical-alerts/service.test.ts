import { describe, expect, it, vi } from "vitest";
import { runCriticalAlertBatch } from "./service";
import type { CriticalAlertDelivery } from "./types";

const delivery: CriticalAlertDelivery = {
  id: "delivery-1",
  errorId: "11111111-1111-4111-8111-111111111111",
  event: "critical.database",
  fingerprint: "fingerprint",
  channel: "email",
  context: { operation: "save" },
  status: "sending",
  attemptCount: 1,
  nextAttemptAt: "2026-08-21T00:00:00.000Z",
  lockedAt: "2026-08-21T00:00:00.000Z",
  lastError: null,
  sentAt: null,
  createdAt: "2026-08-21T00:00:00.000Z",
  updatedAt: "2026-08-21T00:00:00.000Z"
};

describe("runCriticalAlertBatch", () => {
  it("marks a successful alert as sent", async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const fail = vi.fn().mockResolvedValue(undefined);
    const result = await runCriticalAlertBatch(25, {
      claim: vi.fn().mockResolvedValue([delivery]),
      send: vi.fn().mockResolvedValue(undefined),
      complete,
      fail
    });

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(complete).toHaveBeenCalledWith(delivery.id);
    expect(fail).not.toHaveBeenCalled();
  });

  it("records a failed transport without recursively reporting another critical error", async () => {
    const error = new Error("Provider unavailable");
    const complete = vi.fn().mockResolvedValue(undefined);
    const fail = vi.fn().mockResolvedValue(undefined);
    const result = await runCriticalAlertBatch(25, {
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
