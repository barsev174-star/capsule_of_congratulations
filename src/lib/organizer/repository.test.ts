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

import {
  getPendingOrganizerEmailChange,
  revokePendingOrganizerEmailChanges,
  storeMagicLink
} from "./repository";

describe("organizer transfer magic links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.clientQuery.mockResolvedValue({ rows: [] });
  });

  it("serializes transfer replacement and removes every previous pending link", async () => {
    await storeMagicLink("new@example.com", "token-hash", new Date("2026-09-01T12:15:00.000Z"), {
      returnPath: "/manage/card-1",
      transferCardId: "card-1"
    });

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(statements).toEqual([
      "BEGIN",
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.stringContaining("DELETE FROM organizer_magic_links"),
      expect.stringContaining("INSERT INTO organizer_magic_links"),
      "COMMIT"
    ]);
    expect(mocks.release).toHaveBeenCalledOnce();
  });

  it("returns the latest unexpired pending transfer as serializable dates", async () => {
    mocks.query.mockResolvedValue({
      rows: [{
        email: "new@example.com",
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        expiresAt: new Date("2026-09-01T12:15:00.000Z")
      }]
    });

    await expect(getPendingOrganizerEmailChange("card-1")).resolves.toEqual({
      email: "new@example.com",
      createdAt: "2026-09-01T12:00:00.000Z",
      expiresAt: "2026-09-01T12:15:00.000Z"
    });
  });

  it("cancels every unused transfer link for the card", async () => {
    await revokePendingOrganizerEmailChanges("card-1");
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM organizer_magic_links"),
      ["card-1"]
    );
  });
});
