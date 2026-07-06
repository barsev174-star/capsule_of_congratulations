import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { CreateEventReminderInput } from "./types";

const query = vi.fn();

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => true,
  getPostgresPool: () => ({ query })
}));

import { claimDueEventReminders, createEventReminder, releaseEventReminder } from "./repository";

const input: CreateEventReminderInput = {
  recipientName: "Мама",
  occasionText: "День рождения",
  eventDate: "2026-07-05",
  remindOn: null,
  schedule: "confirmation_only",
  email: "user@example.com",
  sourceCardId: null,
  dedupeKey: "dedupe-key"
};

const row = {
  id: "00000000-0000-4000-8000-000000000001",
  recipient_name: input.recipientName,
  occasion_text: input.occasionText,
  event_date: input.eventDate,
  remind_on: input.remindOn,
  schedule: input.schedule,
  email: input.email,
  source_card_id: input.sourceCardId,
  dedupe_key: input.dedupeKey,
  cancel_token_hash: "token-hash",
  confirmation_sent_at: null,
  attempt_count: 0,
  locked_at: null,
  status: "pending",
  sent_at: null,
  cancelled_at: null,
  created_at: "2026-07-03T10:00:00.000Z",
  updated_at: "2026-07-03T10:00:00.000Z"
};

describe("event reminder repository", () => {
  beforeEach(() => query.mockReset());

  it("persists the schedule and nullable reminder date", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await createEventReminder(input);

    expect(result.created).toBe(true);
    expect(result.reminder.schedule).toBe("confirmation_only");
    expect(result.reminder.remindOn).toBeNull();
    expect(result.cancellationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining([null, "confirmation_only"]));
  });

  it("returns the existing reminder when the dedupe key already exists", async () => {
    query.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ ...row, confirmation_sent_at: "2026-07-03T10:01:00.000Z" }] });

    const result = await createEventReminder(input);

    expect(result.created).toBe(false);
    expect(result.cancellationToken).toBeNull();
    expect(result.reminder.id).toBe(row.id);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("rotates the cancellation token when an earlier confirmation was not delivered", async () => {
    query.mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] });

    const result = await createEventReminder(input);

    expect(result.created).toBe(false);
    expect(result.cancellationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2][1][1]).toBe(
      createHash("sha256").update(result.cancellationToken!).digest("hex")
    );
  });

  it("reclaims stale sending rows and increments the attempt atomically", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await claimDueEventReminders("2026-07-13", 25);

    expect(query.mock.calls[0][0]).toContain("locked_at IS NULL OR locked_at < $3");
    expect(query.mock.calls[0][0]).toContain("attempt_count = reminder.attempt_count + 1");
    expect(query.mock.calls[0][1]).toHaveLength(3);
  });

  it("stops retrying after the fifth failed attempt", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await releaseEventReminder(row.id);

    expect(query.mock.calls[0][0]).toContain("attempt_count >= 5 THEN 'failed'");
    expect(query.mock.calls[0][0]).toContain("locked_at = NULL");
  });
});
