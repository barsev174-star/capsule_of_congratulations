import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredSupportNotificationChannels, sendSupportNotification } from "./notifications";
import type { ClaimedSupportNotification } from "./types";

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
    category: "problem",
    contactName: "Анна <тест>",
    email: "anna@example.com",
    message: "Не работает <кнопка>",
    source: "support_page",
    status: "new",
    createdAt: "2026-08-09T00:00:00.000Z",
    updatedAt: "2026-08-09T00:00:00.000Z"
  }
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("support notifications", () => {
  it("always enables only email even if obsolete Telegram variables exist", () => {
    expect(getConfiguredSupportNotificationChannels()).toEqual(["email"]);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token");
    vi.stubEnv("TELEGRAM_SUPPORT_CHAT_ID", "174");
    expect(getConfiguredSupportNotificationChannels()).toEqual(["email"]);
  });

  it("sends the support email to the configured mailbox with a safe reply-to", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@slovesto.ru>");
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "support@slovesto.ru");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSupportNotification(delivery);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["support@slovesto.ru"]);
    expect(body.reply_to).toBe("anna@example.com");
    expect(body.html).toContain("Не работает &lt;кнопка&gt;");
  });

});
