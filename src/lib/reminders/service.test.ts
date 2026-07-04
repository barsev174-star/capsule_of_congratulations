import { describe, expect, it, vi } from "vitest";
import { runEventReminderBatch } from "./service";
import type { EventReminder } from "./types";

const reminder: EventReminder = {
  id: "reminder-1",
  recipientName: "Мама",
  occasionText: "День рождения",
  eventDate: "2026-07-20",
  remindOn: "2026-07-13",
  email: "test@example.com",
  sourceCardId: null,
  dedupeKey: "dedupe",
  status: "sending",
  sentAt: null,
  cancelledAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z"
};

describe("runEventReminderBatch", () => {
  it("marks a delivered reminder as sent", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const complete = vi.fn().mockResolvedValue(undefined);
    const release = vi.fn().mockResolvedValue(undefined);
    const result = await runEventReminderBatch("2026-07-13", {
      claim: vi.fn().mockResolvedValue([reminder]), send, complete, release
    });

    expect(result).toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(complete).toHaveBeenCalledWith(reminder.id);
    expect(release).not.toHaveBeenCalled();
  });

  it("returns a failed reminder to the queue", async () => {
    const complete = vi.fn().mockResolvedValue(undefined);
    const release = vi.fn().mockResolvedValue(undefined);
    const result = await runEventReminderBatch("2026-07-13", {
      claim: vi.fn().mockResolvedValue([reminder]),
      send: vi.fn().mockRejectedValue(new Error("Resend unavailable")),
      complete,
      release
    });

    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 });
    expect(release).toHaveBeenCalledWith(reminder.id);
    expect(complete).not.toHaveBeenCalled();
  });
});
