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

  it("calculates the reminder date seven days before the event", () => {
    const result = validateReminderRequest(form("2026-07-20"), now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.remindOn).toBe("2026-07-13");
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("rejects an event that is too close", () => {
    const result = validateReminderRequest(form("2026-07-09"), now);
    expect(result.ok).toBe(false);
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
