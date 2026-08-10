import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";

const card: CardDraft = {
  id: "card_1",
  publicSlug: "public_1",
  manageToken: "manage_1",
  finalSlug: "final_1",
  recipientName: "Анна",
  occasion: "team",
  occasionText: "собираем открытку от команды Product & Design",
  fromLabel: "команды Product & Design",
  organizerName: "Ирина",
  organizerEmail: "irina@example.com",
  eventDate: null,
  description: "Спасибо за поддержку, энергию и человеческое тепло.",
  signature: null,
  templateId: "team-modern",
  finalBlockSettings: null,
  finalBlockOrder: null,
  finalMessageSettings: null,
  finalMemorySettings: null,
  finalMainGreetingSettings: null,
  status: "draft",
  paymentStatus: "unpaid",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const contributions: Contribution[] = [
  {
    id: "c1",
    cardId: "card_1",
    authorName: "Мария",
    authorRole: "UX Designer",
    authorAvatarUrl: null,
    message: "С тобой всегда чувствуется поддержка, внимание и тепло. Спасибо за мудрость и заботу.",
    sortOrder: 0,
    status: "visible",
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

const mediaAssets: CardMediaAsset[] = [
  {
    id: "media_1",
    cardId: "card_1",
    slot: "portrait",
    publicUrl: "/uploads/cards/card_1/portrait.jpg",
    storagePath: "C:/Project/Поздравления/public/uploads/cards/card_1/portrait.jpg",
    fileName: "portrait.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    captionTitle: "Командное фото",
    captionSubtitle: "День, который хочется помнить",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

describe("buildFinalCardViewModel", () => {
  it("builds a final card model from card and contributions", () => {
    const viewModel = buildFinalCardViewModel(card, contributions);

    expect(viewModel.style).toBe("team-modern");
    expect(viewModel.participantCount).toBe(1);
    expect(viewModel.blocks.length).toBeGreaterThan(0);
    expect(viewModel.summaryTitle).toBe("Самые важные слова");
    expect(viewModel.mainGreetingContributionId).toBeNull();
    expect(viewModel.summaryText).toBe(card.description);
    expect(viewModel.occasionLabel).toBe("собираем открытку от команды Product & Design");
    expect(viewModel.finalSlug).toBe("final_1");
    expect(viewModel.messageLayoutMode).toBe("grid-2");
    expect(viewModel.messageMediaLayout).toBe("portrait");
    expect(viewModel.showAllMessagesLink).toBe(false);
  });

  it("hides optional blocks that organizer disabled", () => {
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        finalBlockSettings: {
          summary: false,
          quotes: false
        }
      },
      contributions
    );

    expect(viewModel.blocks.map((block) => block.id)).toEqual(["hero", "messages", "memories", "closing"]);
  });

    it("passes message presentation settings to the final screen", () => {
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        finalMessageSettings: {
          layoutMode: "carousel-2",
          mediaLayout: "landscape-pair",
          mediaSlots: [],
          mediaAssetIds: [],
          showAllLink: false
        }
      },
      contributions
    );

    expect(viewModel.messageLayoutMode).toBe("carousel-2");
    expect(viewModel.messageMediaLayout).toBe("landscape-pair");
    expect(viewModel.showAllMessagesLink).toBe(false);
  });

  it("shows all-messages link automatically when current layout cannot fit all visible messages", () => {
    const longList: Contribution[] = Array.from({ length: 6 }, (_, index) => ({
      ...contributions[0],
      id: `c${index + 1}`,
      message: `${contributions[0].message} ${index + 1}`,
      sortOrder: index
    }));

    const viewModel = buildFinalCardViewModel(card, longList);

    expect(viewModel.showAllMessagesLink).toBe(true);
  });

  it("keeps uploaded media assets in the final model", () => {
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        finalMessageSettings: {
          layoutMode: "column-media",
          mediaLayout: "portrait",
          mediaSlots: [],
          mediaAssetIds: ["media_1"],
          showAllLink: false
        }
      },
      contributions,
      mediaAssets
    );

    expect(viewModel.mediaAssets).toHaveLength(1);
    expect(viewModel.mediaAssets[0]?.slot).toBe("portrait");
    expect(viewModel.messageMediaAssets).toHaveLength(1);
    expect(viewModel.messageMediaAssets[0]?.slot).toBe("portrait");
    expect(viewModel.mediaAssets[0]?.captionTitle).toBe("Командное фото");
    expect(viewModel.mediaAssets[0]?.captionSubtitle).toBe("Командное фото");
  });

  it("uses the first visible greeting for delivered cards without a saved selection", () => {
    const viewModel = buildFinalCardViewModel(
      { ...card, deliveryStatus: "DELIVERED" },
      contributions
    );

    expect(viewModel.mainGreetingContributionId).toBe("c1");
    expect(viewModel.summaryText).toBe(contributions[0]!.message);
  });

  it("does not borrow a photo from another block or from a global slot", () => {
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        finalMessageSettings: {
          layoutMode: "column-media",
          mediaLayout: "portrait",
          mediaSlots: ["portrait"],
          mediaAssetIds: [],
          showAllLink: false
        },
        finalMemorySettings: {
          title: "Моменты",
          description: "Фото",
          mediaSlots: [],
          mediaAssetIds: ["media_1"],
          photoCount: 3
        }
      },
      contributions,
      mediaAssets
    );

    expect(viewModel.messageMediaAssets).toEqual([]);
    expect(viewModel.memoryMediaAssets.map((asset) => asset.id)).toEqual(["media_1"]);
  });

  it("keeps slot-based photo blocks visible for cards delivered before photo ids were saved", () => {
    const legacyMedia: CardMediaAsset[] = [
      ...mediaAssets,
      { ...mediaAssets[0]!, id: "memory_1", slot: "memory-a" },
      { ...mediaAssets[0]!, id: "memory_2", slot: "memory-b" },
      { ...mediaAssets[0]!, id: "memory_3", slot: "memory-c" }
    ];
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        deliveryStatus: "DELIVERED",
        finalMemorySettings: {
          title: "Моменты",
          description: "Фото",
          mediaSlots: [],
          mediaAssetIds: [],
          photoCount: 3
        }
      },
      contributions,
      legacyMedia
    );

    expect(viewModel.memoryMediaAssets.map((asset) => asset.id)).toEqual(["memory_1", "memory_2", "memory_3"]);
  });

  it("uses saved block order in the final model", () => {
    const viewModel = buildFinalCardViewModel(
      {
        ...card,
        finalBlockOrder: ["hero", "messages", "summary", "qualities", "quotes", "closing", "memories"]
      },
      contributions
    );

    expect(viewModel.blocks.map((block) => block.id)).toEqual([
      "hero",
      "messages",
      "summary",
      "quotes",
      "closing",
      "memories"
    ]);
  });
});
