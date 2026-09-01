import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => true,
  getPostgresPool: () => ({
    query: mocks.query,
    connect: async () => ({ query: mocks.clientQuery, release: mocks.release })
  })
}));

import { hasActiveCardRecoveryToken, resolveCardRecoveryToken, rotateCardRecoveryToken } from "./recovery-tokens";

describe("card recovery tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientQuery.mockResolvedValue({ rows: [] });
  });

  it("looks up an incoming secret only by its SHA-256 hash", async () => {
    mocks.query.mockResolvedValue({ rows: [{ cardId: "card-1" }] });
    await expect(resolveCardRecoveryToken("raw-secret")).resolves.toBe("card-1");
    const params = mocks.query.mock.calls[0][1] as string[];
    expect(params[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(params[0]).not.toBe("raw-secret");
  });

  it("revokes old tokens before creating a rotated token", async () => {
    const rawToken = await rotateCardRecoveryToken("card-1");
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(mocks.clientQuery.mock.calls.map(([sql]) => String(sql))).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("SET revoked_at = now()"),
      expect.stringContaining("INSERT INTO card_recovery_tokens"),
      "COMMIT"
    ]));
    const insertCall = mocks.clientQuery.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO card_recovery_tokens"));
    expect(insertCall?.[1][2]).toMatch(/^[0-9a-f]{64}$/);
    expect(insertCall?.[1][2]).not.toBe(rawToken);
  });

  it("reports whether the card has an active reserve link", async () => {
    mocks.query.mockResolvedValue({ rows: [{ active: true }] });
    await expect(hasActiveCardRecoveryToken("card-1")).resolves.toBe(true);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("SELECT EXISTS"), ["card-1"]);
  });
});
