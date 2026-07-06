import { describe, expect, it } from "vitest";
import { validateReminderRequest } from "./validation";

const form = (eventDate: string) => {
  const data = new FormData();
  data.set("recipientName", "Мама");
  data.set("occasionText", "День рождения");
  data.set("eventDate", eventDate);
  data.set("email", "USER@example.com");
  data.set("consent", "on");
  data.set("sourceCardId", "00000000-0000-0000-0000-000000000001");
  return data;
};

describe("reminder validation", () => {
  const now = new Date("2026-07-03T10:00:00.000Z");

  it("schedules an event eight or more days away for seven days before it", () => {
    const result = validateReminderRequest(form("2026-07-20"), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.remindOn).toBe("2026-07-13");
      expect(result.data.schedule).toBe("seven_days_before");
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("schedules an event three to seven days away for tomorrow", () => {
    const result = validateReminderRequest(form("2026-07-09"), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.remindOn).toBe("2026-07-04");
      expect(result.data.schedule).toBe("next_day");
    }
  });

  it("keeps an event one or two days away as confirmation-only", () => {
    const result = validateReminderRequest(form("2026-07-05"), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.remindOn).toBeNull();
      expect(result.data.schedule).toBe("confirmation_only");
    }
  });

  it("rejects an event today or in the past", () => {
    expect(validateReminderRequest(form("2026-07-03"), now).ok).toBe(false);
    expect(validateReminderRequest(form("2026-07-02"), now).ok).toBe(false);
  });

  it("uses the Yekaterinburg calendar date around UTC midnight", () => {
    const lateUtc = new Date("2026-07-03T21:30:00.000Z");
    const result = validateReminderRequest(form("2026-07-05"), lateUtc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schedule).toBe("confirmation_only");
      expect(result.data.remindOn).toBeNull();
    }
    expect(validateReminderRequest(form("2026-07-04"), lateUtc).ok).toBe(false);
  });

  it("creates the same dedupe key for equivalent normalized input", () => {
    const first = validateReminderRequest(form("2026-07-20"), now);
    const secondForm = form("2026-07-20");
    secondForm.set("email", "user@example.com");
    secondForm.set("recipientName", "Мама");
    const second = validateReminderRequest(secondForm, now);
    expect(first.ok && second.ok && first.data.dedupeKey).toBe(second.ok ? second.data.dedupeKey : "");
  });
});
