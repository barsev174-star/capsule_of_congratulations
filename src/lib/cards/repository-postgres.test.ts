import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("@/lib/db/postgres", () => ({
  getPostgresPool: () => ({ query: mocks.query })
}));

import { restoreDeletedCard } from "./repository-postgres";

describe("PostgreSQL card restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
  });

  it("makes a restored card public again during the recovery window", async () => {
    await expect(restoreDeletedCard("card-id")).resolves.toBeNull();

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringMatching(/is_hidden = false, hidden_at = NULL/),
      ["card-id"]
    );
  });
});
