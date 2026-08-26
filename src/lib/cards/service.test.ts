import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveCardDraft: vi.fn(),
  saveContribution: vi.fn(),
  trackFunnel: vi.fn()
}));

vi.mock("@/lib/cards/repository", () => ({
  saveCardDraft: mocks.saveCardDraft,
  saveContribution: mocks.saveContribution
}));

vi.mock("@/lib/telemetry", () => ({
  trackFunnel: mocks.trackFunnel
}));

import { createEmptyCardDraft } from "@/lib/cards/service";

describe("empty card draft creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds safe landing attribution to the existing card-created event", async () => {
    const result = await createEmptyCardDraft({
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      utm_source: "yandex",
      utm_medium: "organic",
      cardId: "spoofed"
    });

    expect(mocks.saveCardDraft).toHaveBeenCalledWith(result.card);
    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_created", {
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      utm_source: "yandex",
      utm_medium: "organic",
      cardId: result.card.id,
      occasion: "personal",
      templateId: null
    });
  });

  it("persists an initial teacher template before tracking the created card", async () => {
    const result = await createEmptyCardDraft(
      {
        landing_type: "teacher",
        landing_path: "/gruppovaya-otkrytka/uchitelyu"
      },
      { templateId: "school-classic" }
    );

    expect(result.card.templateId).toBe("school-classic");
    expect(mocks.saveCardDraft).toHaveBeenCalledWith(expect.objectContaining({
      id: result.card.id,
      templateId: "school-classic"
    }));
    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_created", {
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      cardId: result.card.id,
      occasion: "personal",
      templateId: "school-classic"
    });
    expect(mocks.saveCardDraft.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.trackFunnel.mock.invocationCallOrder[0]);
  });

  it("persists the birthday inscription without adding example names or greetings", async () => {
    const result = await createEmptyCardDraft({}, { templateId: "paper-birthday", occasionText: "С днём рождения!" });
    expect(mocks.saveCardDraft).toHaveBeenCalledWith(expect.objectContaining({
      templateId: "paper-birthday", occasionText: "С днём рождения!", recipientName: "", fromLabel: ""
    }));
    expect(result.chatMessage).toContain("С днём рождения!");
    expect((await createEmptyCardDraft()).card.occasionText).toBe("");
  });
});
