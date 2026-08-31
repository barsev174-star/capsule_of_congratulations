import { describe, expect, it } from "vitest";
import type { CardDraft, Contribution } from "@/lib/cards/types";
import { cardTemplates } from "@/lib/cards/templates";
import { getGiftRevealPreviewProfile } from "@/lib/gift-reveal-profiles";
import { selectGiftRevealMessages, toGiftRevealExcerpt } from "@/lib/gift-reveal-preview";

const contribution = (id: string, message = `Поздравление номер ${id} содержит несколько добрых слов`): Contribution => ({
  id,
  cardId: "card",
  authorName: `Автор ${id}`,
  authorRole: null,
  authorAvatarUrl: null,
  message,
  sortOrder: Number(id),
  status: "visible",
  source: "participant",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
});

describe("gift reveal preview", () => {
  it("keeps whole words, adds an ellipsis, and never reproduces a short message in full", () => {
    expect(toGiftRevealExcerpt("Спасибо за всё")) .toBe("Спасибо за…");
    expect(toGiftRevealExcerpt("Раз два три четыре пять шесть семь"))
      .toBe("Раз два три четыре пять шесть…");
  });

  it("selects the main greeting followed by the first five greetings in card order", () => {
    const contributions = Array.from({ length: 8 }, (_, index) => contribution(String(index + 1)));
    const card = {
      deliveryStatus: "DELIVERED",
      finalMainGreetingSettings: { contributionId: "4" }
    } satisfies Pick<CardDraft, "deliveryStatus" | "finalMainGreetingSettings">;

    expect(selectGiftRevealMessages(card, contributions).map((item) => item.id))
      .toEqual(["4", "1", "2", "3", "5", "6"]);
  });

  it("requires a reveal preview profile for every product template", () => {
    for (const template of cardTemplates) {
      const revealProfile = getGiftRevealPreviewProfile(template.id);
      expect(revealProfile, template.id).not.toBeNull();
      expect(template.introVisualPreset, `${template.id}: envelope preview`).toBe(revealProfile?.visualPreset);
    }
  });
});
