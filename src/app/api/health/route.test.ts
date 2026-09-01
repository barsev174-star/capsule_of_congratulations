import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  query: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: mocks.configured,
  getPostgresPool: () => ({ query: mocks.query })
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
  });

  it("reports readiness only after a database round trip", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, database: "ready" });
    expect(mocks.query).toHaveBeenCalledWith("SELECT 1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails readiness when PostgreSQL is unavailable", async () => {
    mocks.query.mockRejectedValue(new Error("offline"));
    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, database: "unavailable" });
  });
});
