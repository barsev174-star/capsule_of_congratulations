import type { CardDraft, Contribution } from "@/lib/cards/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";

const card: CardDraft = {
  id: "card_1",
  publicSlug: "public_1",
  manageToken: "manage_1",
  finalSlug: "final_1",
  recipientName: "Анна",
  occasion: "colleague",
  fromLabel: "команды Product & Design",
  organizerName: "Ирина",
  organizerEmail: "irina@example.com",
  eventDate: null,
  description: "Спасибо за поддержку, энергию и человеческое тепло.",
  templateId: "team-modern",
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
    message: "С тобой всегда чувствуется поддержка, внимание и тепло. Спасибо за мудрость и заботу.",
    status: "visible",
    source: "manual",
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
    expect(viewModel.summaryTitle).toContain("Анна");
  });
});
