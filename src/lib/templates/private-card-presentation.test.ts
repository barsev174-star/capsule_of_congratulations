import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildPrivateCardPresentation } from "./private-card-presentation";

const card = {
  id: "card-1",
  publicSlug: "public-1",
  manageToken: "manage-1",
  finalSlug: "final-1",
  recipientName: "Наталья Афанасьевна",
  occasion: "teacher",
  occasionText: "С Днём Рождения!",
  fromLabel: "От 5Б класса",
  organizerName: "Мария",
  organizerEmail: "maria@example.com",
  eventDate: "2026-08-11",
  description: "Спасибо за поддержку и вдохновение.",
  signature: "С теплом — от всего класса.",
  templateId: "school-scrapbook",
  finalBlockSettings: null,
  finalBlockOrder: null,
  finalMessageSettings: {
    layoutMode: "column-media",
    mediaLayout: "portrait",
    mediaSlots: ["portrait"],
    mediaAssetIds: ["photo-1"],
    showAllLink: false
  },
  finalMainGreetingSettings: null,
  finalMemorySettings: null,
  status: "draft",
  paymentStatus: "UNPAID",
  deletedAt: null,
  purgeAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
} satisfies CardDraft;

const contributions = [{
  id: "contribution-1",
  cardId: card.id,
  authorName: "Татьяна",
  authorRole: "коллега",
  authorAvatarUrl: null,
  message: "Спасибо за доброту и чувство юмора.",
  sortOrder: 0,
  status: "visible",
  source: "manual",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
}] satisfies Contribution[];

const mediaAssets = [{
  id: "photo-1",
  cardId: card.id,
  slot: "portrait",
  publicUrl: "/uploads/photo-1.jpg",
  storagePath: "uploads/photo-1.jpg",
  fileName: "photo-1.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  captionTitle: "Наш класс",
  captionSubtitle: "День, который хочется помнить",
  imageWidth: 1200,
  imageHeight: 1600,
  cropX: 40,
  cropY: 60,
  cropZoom: 1.25,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
}] satisfies CardMediaAsset[];

describe("buildPrivateCardPresentation", () => {
  it("dispatches a real school card to the universal renderer", () => {
    const presentation = buildPrivateCardPresentation(card, contributions, mediaAssets, {
      qualities: ["доброта", "юмор", "надёжность", "внимание", "вдохновение"],
      quotes: ["Тёплые слова", "Яркие моменты", "Спасибо за поддержку"]
    });

    expect(presentation?.kind).toBe("universal-v1");
    if (!presentation || presentation.kind !== "universal-v1") return;
    expect(presentation.dispatch.registration.id).toBe("school-scrapbook");
    expect(presentation.model).toMatchObject({
      templateId: "school-scrapbook",
      recipientName: "Наталья Афанасьевна",
      eventDate: "2026-08-11",
      messageScenario: "portrait",
      privateSignature: "С теплом — от всего класса.",
      qualities: ["доброта", "юмор", "надёжность", "внимание", "вдохновение"]
    });
    expect(presentation.model.messagePhotos[0]).toMatchObject({
      src: "/uploads/photo-1.jpg",
      caption: "Наш класс",
      crop: { x: .4, y: .6, zoom: 1.25 }
    });
  });

  it("keeps a legacy product card on the legacy renderer", () => {
    const presentation = buildPrivateCardPresentation({
      ...card,
      templateId: "paper-birthday"
    }, contributions);

    expect(presentation?.kind).toBe("legacy");
    if (!presentation || presentation.kind !== "legacy") return;
    expect(presentation.model.style).toBe("paper-birthday");
  });
});
