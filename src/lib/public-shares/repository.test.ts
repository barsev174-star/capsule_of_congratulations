import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicCardShare } from "./types";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("@/lib/db/postgres", () => ({
  getPostgresPool: () => ({ query: queryMock })
}));

import { updatePublicShare } from "./repository";

const share: PublicCardShare = {
  id: "6b417b91-e91f-4e43-9abc-cf034f57e285",
  cardId: "605df8b9-8115-4b10-bc4b-9304e05f34bf",
  tokenHash: null,
  status: "DRAFT",
  payloadVersion: 2,
  displayName: "Наталья",
  showPublicName: true,
  headlinePreset: "GIFTED_CARD",
  showOccasion: true,
  showEventDate: true,
  showGreetingCount: true,
  showPhotoCount: true,
  publicSummary: null,
  publicQualities: [],
  publicPhrases: [],
  publicPhraseCandidateIds: [],
  photoConsentVersion: null,
  photoConsentAcceptedAt: null,
  createdAt: "2026-08-16T00:00:00.000Z",
  updatedAt: "2026-08-16T00:00:00.000Z",
  activatedAt: null,
  revision: 1,
  revokedAt: null,
  revokedBy: null
};

describe("public share repository", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("синхронизирует версию payload при обновлении universal-черновика", async () => {
    await updatePublicShare(share);

    expect(queryMock.mock.calls[0]?.[0]).toContain("payload_version = $13");
    expect(queryMock.mock.calls[0]?.[1]).toHaveLength(13);
    expect(queryMock.mock.calls[0]?.[1]?.[12]).toBe(2);
  });
});
