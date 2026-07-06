import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEventReminderConfirmationEmail, sendEventReminderEmail } from "./email";
import type { EventReminder } from "./types";

const reminder: EventReminder = {
  id: "00000000-0000-4000-8000-000000000001",
  recipientName: "Мама",
  occasionText: "День рождения",
  eventDate: "2026-07-20",
  remindOn: "2026-07-13",
  schedule: "seven_days_before",
  email: "user@example.com",
  sourceCardId: null,
  dedupeKey: "dedupe",
  cancellationTokenHash: "hash",
  confirmationSentAt: null,
  attemptCount: 0,
  lockedAt: null,
  status: "pending",
  sentAt: null,
  cancelledAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z"
};

describe("event reminder emails", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("EMAIL_FROM", "Дари слова <hello@example.com>");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => vi.unstubAllEnvs());

  it("sends the confirmation with a cancellation link", async () => {
    await sendEventReminderConfirmationEmail(reminder, "token");
    const request = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(String(request?.body));
    expect(body.subject).toBe("Напоминание сохранено — День рождения");
    expect(body.text).toContain("https://example.com/reminders/cancel/token");
    expect(request?.headers).toMatchObject({ "Idempotency-Key": `event-reminder-confirmation-${reminder.id}` });
  });

  it("does not offer cancellation when no second email is scheduled", async () => {
    await sendEventReminderConfirmationEmail({ ...reminder, schedule: "confirmation_only", remindOn: null }, "token");
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.text).toContain("Отдельное напоминание отправлять не будем");
    expect(body.text).not.toContain("/reminders/cancel/");
  });

  it("uses the agreed subject and CTA for the scheduled reminder", async () => {
    await sendEventReminderEmail(reminder);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.subject).toBe("Пора собрать открытку: Мама");
    expect(body.text).toContain("Через 7 дней — День рождения.");
    expect(body.text).toContain("Собрать открытку: https://example.com/create");
  });
});
