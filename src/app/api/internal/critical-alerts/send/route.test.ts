import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/critical-alerts/service", () => ({ runCriticalAlertBatch: mocks.run }));

import { POST } from "./route";

describe("critical alert internal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "secret");
    mocks.run.mockResolvedValue({ claimed: 1, sent: 1, failed: 0 });
  });

  it("rejects a request without the cron secret", async () => {
    const response = await POST(new Request("http://localhost/api/internal/critical-alerts/send", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("processes a bounded batch for an authorized request", async () => {
    const response = await POST(new Request("http://localhost/api/internal/critical-alerts/send", {
      method: "POST",
      headers: { authorization: "Bearer secret" }
    }));
    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith(50);
  });
});
