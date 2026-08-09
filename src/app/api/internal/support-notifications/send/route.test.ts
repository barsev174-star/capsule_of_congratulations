import { afterEach, describe, expect, it, vi } from "vitest";

const { runSupportNotificationBatch } = vi.hoisted(() => ({
  runSupportNotificationBatch: vi.fn()
}));
vi.mock("@/lib/support/notifications-service", () => ({ runSupportNotificationBatch }));

import { POST } from "./route";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/internal/support-notifications/send", () => {
  it("rejects a request without the cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "support-secret");
    const response = await POST(new Request("http://localhost/api/internal/support-notifications/send", {
      method: "POST"
    }));

    expect(response.status).toBe(401);
    expect(runSupportNotificationBatch).not.toHaveBeenCalled();
  });

  it("runs a bounded batch with the correct secret", async () => {
    vi.stubEnv("CRON_SECRET", "support-secret");
    runSupportNotificationBatch.mockResolvedValue({ claimed: 1, sent: 1, failed: 0 });
    const response = await POST(new Request("http://localhost/api/internal/support-notifications/send", {
      method: "POST",
      headers: { Authorization: "Bearer support-secret" }
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });
    expect(runSupportNotificationBatch).toHaveBeenCalledWith({ limit: 50 });
  });
});
