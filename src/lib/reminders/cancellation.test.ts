import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => true,
  getPostgresPool: () => ({ query })
}));

import { cancelEventReminder, getEventReminderCancellationState } from "./repository";

const token = "a".repeat(43);

describe("event reminder cancellation", () => {
  beforeEach(() => query.mockReset());

  it("cancels a pending reminder atomically", async () => {
    query.mockResolvedValueOnce({ rows: [{ status: "cancelled" }] });
    await expect(cancelEventReminder(token)).resolves.toBe("cancelled");
    expect(query.mock.calls[0][0]).toContain("status IN ('pending', 'failed')");
  });

  it("reports an already cancelled reminder", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ status: "cancelled" }] });
    await expect(cancelEventReminder(token)).resolves.toBe("cancelled");
  });

  it("does not cancel a sent reminder", async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ status: "sent" }] });
    await expect(cancelEventReminder(token)).resolves.toBe("sent");
  });

  it("does not reveal a reminder for an unknown token", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await expect(getEventReminderCancellationState(token)).resolves.toBe("not_found");
  });
});
