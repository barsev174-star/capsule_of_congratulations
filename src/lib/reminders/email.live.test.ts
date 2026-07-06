import { describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { sendEventReminderConfirmationEmail, sendEventReminderEmail } from "./email";
import type { EventReminder } from "./types";

const live = process.env.RUN_REMINDER_EMAIL_LIVE === "1" ? describe : describe.skip;

live("event reminder live email", () => {
  it("delivers the confirmation and scheduled reminder through Resend", async () => {
    const email = process.env.REMINDER_LIVE_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
    expect(email, "REMINDER_LIVE_EMAIL or ADMIN_EMAIL is required").toBeTruthy();
    expect(process.env.RESEND_API_KEY, "RESEND_API_KEY is required").toBeTruthy();
    expect(process.env.EMAIL_FROM, "EMAIL_FROM is required").toBeTruthy();

    const id = randomUUID();
    const reminder: EventReminder = {
      id,
      recipientName: "Тестовое событие",
      occasionText: "Проверка напоминаний",
      eventDate: "2026-07-20",
      remindOn: "2026-07-13",
      schedule: "seven_days_before",
      email: email!,
      sourceCardId: null,
      dedupeKey: `live-${id}`,
      cancellationTokenHash: "live-test-only",
      confirmationSentAt: null,
      attemptCount: 0,
      lockedAt: null,
      status: "pending",
      sentAt: null,
      cancelledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await sendEventReminderConfirmationEmail(reminder, randomBytes(32).toString("base64url"));
    await sendEventReminderEmail(reminder);
  }, 30_000);
});
