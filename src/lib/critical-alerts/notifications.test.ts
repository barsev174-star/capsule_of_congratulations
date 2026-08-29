import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConfiguredCriticalAlertChannels,
  getVisibleCriticalAlertContext,
  sendCriticalAlert
} from "./notifications";
import type { CriticalAlertDelivery } from "./types";

const delivery: CriticalAlertDelivery = {
  id: "delivery-1",
  errorId: "11111111-1111-4111-8111-111111111111",
  event: "critical.publication",
  fingerprint: "fingerprint",
  channel: "email",
  context: { operation: "publish", cardId: "card-1", email: "private@example.com", message: "private" },
  status: "sending",
  attemptCount: 1,
  nextAttemptAt: "2026-08-21T00:00:00.000Z",
  lockedAt: "2026-08-21T00:00:00.000Z",
  lastError: null,
  sentAt: null,
  createdAt: "2026-08-21T00:00:00.000Z",
  updatedAt: "2026-08-21T00:00:00.000Z"
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("critical alert notifications", () => {
  it("enables only fully configured transports", () => {
    expect(getConfiguredCriticalAlertChannels()).toEqual([]);
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@slovesto.ru>");
    expect(getConfiguredCriticalAlertChannels()).toEqual(["email"]);
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token");
    vi.stubEnv("TELEGRAM_SUPPORT_CHAT_ID", "174");
    expect(getConfiguredCriticalAlertChannels()).toEqual(["email"]);
  });

  it("keeps only safe operational context", () => {
    expect(getVisibleCriticalAlertContext(delivery.context)).toEqual({ operation: "publish", cardId: "card-1" });
  });

  it("sends a neutral email without private fields", async () => {
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@slovesto.ru>");
    vi.stubEnv("CRITICAL_ALERT_EMAIL", "alerts@slovesto.ru");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendCriticalAlert(delivery);

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.to).toEqual(["alerts@slovesto.ru"]);
    expect(body.text).toContain("critical.publication");
    expect(body.text).not.toContain("private@example.com");
    expect(body.html).toContain("#202124");
  });

});
