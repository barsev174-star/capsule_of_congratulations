import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  getPostgresPool: () => ({ query: mocks.query, connect: mocks.connect })
}));

import { listCardRetentionCandidates, purgeCardToTombstone, restoreDeletedCard } from "./repository-postgres";

describe("PostgreSQL card restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue({ rows: [] });
    mocks.connect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
    mocks.clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it("makes a restored card public again during the recovery window", async () => {
    await expect(restoreDeletedCard("card-id")).resolves.toBeNull();

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringMatching(/is_hidden = false, hidden_at = NULL/),
      ["card-id"]
    );
  });

  it("selects delivered cards only after twelve months from delivery or first opening", async () => {
    const draftCutoff = new Date("2026-06-01T00:00:00.000Z");
    const deliveredCutoff = new Date("2025-08-30T00:00:00.000Z");
    const now = new Date("2026-08-30T00:00:00.000Z");

    await listCardRetentionCandidates(draftCutoff, deliveredCutoff, now);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringMatching(/delivery_status = 'DELIVERED'[\s\S]*GREATEST\(delivered_at, COALESCE\(recipient_first_opened_at, delivered_at\)\) < \$2/),
      [draftCutoff, deliveredCutoff, now]
    );
  });

  it("removes public-share copies before card media and returns every storage path", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT id FROM cards")) return { rows: [{ id: "card-id" }], rowCount: 1 };
      if (sql.includes("SELECT storage_path FROM card_media_assets")) {
        return { rows: [{ storage_path: "cards/card-id/photo.webp" }], rowCount: 1 };
      }
      if (sql.includes("SELECT photo.storage_path")) {
        return { rows: [{ storage_path: "public-shares/share-id/photo.webp" }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(purgeCardToTombstone("card-id")).resolves.toEqual({
      cardMediaPaths: ["cards/card-id/photo.webp"],
      publicShareMediaPaths: ["public-shares/share-id/photo.webp"]
    });

    const statements = mocks.clientQuery.mock.calls.map(([sql]) => String(sql));
    const sharePhotos = statements.findIndex((sql) => sql.includes("DELETE FROM public_card_share_photos"));
    const cardMedia = statements.findIndex((sql) => sql.includes("DELETE FROM card_media_assets"));
    expect(sharePhotos).toBeGreaterThan(-1);
    expect(cardMedia).toBeGreaterThan(sharePhotos);
    expect(statements).toEqual(expect.arrayContaining([
      expect.stringContaining("DELETE FROM public_card_shares"),
      expect.stringContaining("DELETE FROM public_card_share_phrase_candidates"),
      expect.stringContaining("DELETE FROM ai_semantic_plan_cache"),
      expect.stringContaining("DELETE FROM ai_card_quote_selections")
    ]));
    expect(mocks.clientQuery).toHaveBeenCalledWith("COMMIT");
    expect(mocks.release).toHaveBeenCalledOnce();
  });
});
