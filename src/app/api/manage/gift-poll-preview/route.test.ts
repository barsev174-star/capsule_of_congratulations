import { beforeEach, describe, expect, it, vi } from "vitest";

const getCardDraftByManageToken = vi.fn();
const previewGiftLink = vi.fn();

vi.mock("@/lib/cards/repository", () => ({ getCardDraftByManageToken: (...args: unknown[]) => getCardDraftByManageToken(...args) }));
vi.mock("@/lib/gift-polls/link-preview", () => ({ previewGiftLink: (...args: unknown[]) => previewGiftLink(...args) }));

import { POST } from "./route";

const draftPreview = {
  extractedUrl: "https://example.com/p/1",
  resolvedUrl: "https://example.com/p/1",
  metadata: { title: "Лодка Аква 2900", description: null, imageUrl: null, price: null, storeName: "Другой магазин" },
  warnings: ["METADATA_PARTIAL"]
};

const post = (body: unknown) => POST(new Request("http://localhost/api/manage/gift-poll-preview", { method: "POST", body: JSON.stringify(body) }));

describe("gift-poll-preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCardDraftByManageToken.mockResolvedValue({ id: "card_1" });
    previewGiftLink.mockResolvedValue(draftPreview);
  });

  it("returns an import draft without creating a gift option", async () => {
    const response = await post({ manageToken: "token", rawInput: "https://example.com/p/1" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(draftPreview);
    expect(previewGiftLink).toHaveBeenCalledWith("https://example.com/p/1");
  });

  it("rejects requests without a valid manage token", async () => {
    getCardDraftByManageToken.mockResolvedValue(null);
    const response = await post({ manageToken: "token", rawInput: "https://example.com/p/1" });
    expect(response.status).toBe(403);
    expect(previewGiftLink).not.toHaveBeenCalled();
  });

  it("rejects malformed bodies", async () => {
    const response = await post({ manageToken: "token" });
    expect(response.status).toBe(400);
    expect(previewGiftLink).not.toHaveBeenCalled();
  });
});
