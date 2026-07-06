import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  purgeExpiredCards: vi.fn(),
  loggerInfo: vi.fn(),
  reportCriticalError: vi.fn()
}));

vi.mock("@/lib/cards/repository", () => ({ purgeExpiredCards: mocks.purgeExpiredCards }));
vi.mock("@/lib/logger", () => ({ logger: { info: mocks.loggerInfo } }));
vi.mock("@/lib/telemetry", () => ({ reportCriticalError: mocks.reportCriticalError }));

import { POST } from "./route";

describe("retention endpoint", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "retention-secret";
    mocks.purgeExpiredCards.mockResolvedValue([
      { id: "deleted-card", reason: "deleted" },
      { id: "old-draft", reason: "inactive_draft" }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("rejects requests without the internal secret", async () => {
    const response = await POST(new Request("http://localhost/api/internal/retention/run", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.purgeExpiredCards).not.toHaveBeenCalled();
  });

  it("purges expired cards and returns safe counts", async () => {
    const response = await POST(new Request("http://localhost/api/internal/retention/run", {
      method: "POST",
      headers: { Authorization: "Bearer retention-secret" }
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, deleted: 1, inactiveDrafts: 1 });
  });
});
