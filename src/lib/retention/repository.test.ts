import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isPostgresConfigured: vi.fn(),
  connect: vi.fn(),
  query: vi.fn(),
  release: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: mocks.isPostgresConfigured,
  getPostgresPool: () => ({ connect: mocks.connect })
}));

import { purgeSecondaryRetentionData } from "./repository";

describe("secondary retention repository", () => {
  beforeEach(() => {
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
    let affected = 0;
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rowCount: null, rows: [] };
      affected += 1;
      return { rowCount: affected, rows: [] };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts without a configured production database", async () => {
    mocks.isPostgresConfigured.mockReturnValue(false);

    await expect(purgeSecondaryRetentionData(new Date("2026-08-30T00:00:00.000Z"))).resolves.toEqual({
      semanticPlans: 0,
      magicLinks: 0,
      reminders: 0,
      supportDeliveries: 0,
      supportRequests: 0,
      telemetry: 0,
      criticalAlerts: 0,
      paymentAttemptsSanitized: 0,
      paymentRefundsSanitized: 0,
      paymentEventsSanitized: 0
    });
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("deletes or sanitizes every secondary category with bounded cutoffs", async () => {
    const now = new Date("2026-08-30T00:00:00.000Z");
    const result = await purgeSecondaryRetentionData(now);

    expect(result).toEqual({
      semanticPlans: 1,
      magicLinks: 2,
      reminders: 3,
      supportDeliveries: 4,
      supportRequests: 5,
      telemetry: 6,
      criticalAlerts: 7,
      paymentAttemptsSanitized: 8,
      paymentRefundsSanitized: 9,
      paymentEventsSanitized: 10
    });
    const statements = mocks.query.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual(expect.arrayContaining([
      expect.stringContaining("DELETE FROM organizer_magic_links"),
      expect.stringContaining("DELETE FROM event_reminders"),
      expect.stringContaining("DELETE FROM support_requests"),
      expect.stringContaining("DELETE FROM telemetry_events"),
      expect.stringContaining("UPDATE payment_attempts"),
      expect.stringContaining("UPDATE payment_refunds"),
      expect.stringContaining("UPDATE payment_events")
    ]));
    expect(mocks.query).toHaveBeenCalledWith("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();

    const magicLinkCall = mocks.query.mock.calls.find(([sql]) => String(sql).includes("organizer_magic_links"));
    expect((magicLinkCall?.[1] as Date[])[0]?.toISOString()).toBe("2026-07-31T00:00:00.000Z");
    const supportCall = mocks.query.mock.calls.find(([sql]) => String(sql).includes("DELETE FROM support_requests"));
    expect((supportCall?.[1] as Date[]).map((date) => date.toISOString())).toEqual([
      "2025-08-30T00:00:00.000Z",
      "2024-08-30T00:00:00.000Z"
    ]);
  });

  it("rolls back and releases the connection when a cleanup query fails", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("event_reminders")) throw new Error("retention failed");
      return { rowCount: 0, rows: [] };
    });

    await expect(purgeSecondaryRetentionData(new Date("2026-08-30T00:00:00.000Z"))).rejects.toThrow("retention failed");
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
