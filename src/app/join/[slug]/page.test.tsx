const mocks = vi.hoisted(() => ({ card: vi.fn(), lifecycle: vi.fn() }));
vi.mock("@/lib/cards/repository", () => ({
  getCardDraftByPublicSlug: mocks.card,
  listContributionsByCardId: vi.fn(), listAllContributionsByCardId: vi.fn()
}));
vi.mock("@/lib/cards/lifecycle-repository", () => ({ getCardLifecycleByPublicSlug: mocks.lifecycle }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import JoinCardPage, { generateMetadata } from "./page";

describe("participant invitation metadata", () => {
  const params = Promise.resolve({ slug: "public-slug" });
  const lifecycle = { collectionStatus: "OPEN", deliveryStatus: "PREPARING", purgedAt: null, deletedAt: null, isHidden: false };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.card.mockResolvedValue({ templateId: "team-editorial", recipientName: "Личное имя", manageToken: "private-management-secret", finalSlug: "private-gift-secret" });
    mocks.lifecycle.mockResolvedValue(lifecycle);
  });

  it("reads the actual selected template without exposing private card fields", async () => {
    const metadata = await generateMetadata({ params });
    expect(mocks.card).toHaveBeenCalledWith("public-slug");
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "/assets/share-og/team-editorial-v1.png" })]);
    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toContain("Личное имя");
    expect(serialized).not.toContain("private-");
    mocks.card.mockResolvedValue({ templateId: "kindergarten-doodles" });
    expect((await generateMetadata({ params })).openGraph?.images).toEqual([expect.objectContaining({ url: "/assets/share-og/kindergarten-doodles-v1.png" })]);
  });

  it.each([
    { collectionStatus: "DRAFT" }, { purgedAt: "2026-08-26" }, { deletedAt: "2026-08-26" }, { isHidden: true }
  ])("withholds artwork and page content for inaccessible state %j", async (state) => {
    mocks.lifecycle.mockResolvedValue({ ...lifecycle, ...state });
    expect((await generateMetadata({ params })).openGraph?.images).toEqual([]);
    await expect(JoinCardPage({ params })).rejects.toThrow("NOT_FOUND");
  });

  it("does not disclose artwork for a missing invitation", async () => {
    mocks.card.mockResolvedValue(null);
    expect((await generateMetadata({ params })).openGraph?.images).toEqual([]);
    await expect(JoinCardPage({ params })).rejects.toThrow("NOT_FOUND");
  });

  it("keeps artwork available when collection is closed", async () => {
    mocks.lifecycle.mockResolvedValue({ ...lifecycle, collectionStatus: "CLOSED", deliveryStatus: "DELIVERED" });
    const metadata = await generateMetadata({ params });
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "/assets/share-og/team-editorial-v1.png" })]);
    expect(metadata.openGraph?.title).toBe("Сбор поздравлений завершён — Slovesto");
  });
});
