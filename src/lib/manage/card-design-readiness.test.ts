import { describe, expect, it } from "vitest";
import type { CardDesignReadinessInput } from "./card-design-readiness";
import { buildCardBlockReadiness, buildOrganizerJourney } from "./card-design-readiness";

const input = (overrides: Partial<CardDesignReadinessInput> = {}): CardDesignReadinessInput => ({
  card: {
    recipientName: "Анна",
    occasionText: "С днём рождения!",
    fromLabel: "Коллеги",
    templateId: "paper-birthday",
    finalBlockSettings: {
      summary: true,
      qualities: true,
      memories: true,
      quotes: true
    },
    finalMessageSettings: {
      layoutMode: "grid-2",
      mediaLayout: "portrait",
      mediaSlots: [],
      mediaAssetIds: [],
      showAllLink: false
    },
    finalMainGreetingSettings: { contributionId: null },
    finalMemorySettings: {
      title: "Моменты",
      description: "Фото, которые хочется сохранить",
      mediaSlots: [],
      mediaAssetIds: [],
      photoCount: 3
    }
  },
  requiredBlockIds: ["hero", "summary", "messages", "closing"],
  visibleContributions: [],
  mediaAssets: [],
  qualities: [],
  qualitiesAreStale: false,
  bestQuotes: [],
  bestQuotesAreStale: false,
  ...overrides
});

const byId = (result: ReturnType<typeof buildCardBlockReadiness>, blockId: string) =>
  result.find((block) => block.blockId === blockId)!;

describe("buildCardBlockReadiness", () => {
  it("marks the cover ready only when the required basis and template are present", () => {
    expect(byId(buildCardBlockReadiness(input()), "hero").status).toBe("READY");
    const result = buildCardBlockReadiness(input({
      card: { ...input().card, recipientName: "" }
    }));
    expect(byId(result, "hero").status).toBe("ACTION_REQUIRED");
  });

  it("requires an explicit main greeting instead of the rendering fallback", () => {
    const contribution = { id: "greeting-1" };
    const waiting = buildCardBlockReadiness(input({ visibleContributions: [contribution] }));
    expect(byId(waiting, "summary").status).toBe("ACTION_REQUIRED");

    const ready = buildCardBlockReadiness(input({
      visibleContributions: [contribution],
      card: { ...input().card, finalMainGreetingSettings: { contributionId: contribution.id } }
    }));
    expect(byId(ready, "summary").status).toBe("READY");
  });

  it("uses content-specific waiting labels", () => {
    const result = buildCardBlockReadiness(input());
    expect(byId(result, "summary").statusLabel).toBe("Ждёт поздравлений");
    expect(byId(result, "memories").statusLabel).toBe("Нужно назначить фото");
    expect(byId(result, "quotes").statusLabel).toBe("Нужны поздравления");
  });

  it("requires six greetings for qualities and respects the stale state", () => {
    const notEnough = Array.from({ length: 5 }, (_, index) => ({ id: String(index + 1) }));
    expect(byId(buildCardBlockReadiness(input({ visibleContributions: notEnough })), "qualities").status)
      .toBe("WAITING_FOR_CONTENT");

    const contributions = Array.from({ length: 6 }, (_, index) => ({ id: String(index + 1) }));
    expect(byId(buildCardBlockReadiness(input({ visibleContributions: contributions })), "qualities").status)
      .toBe("ACTION_REQUIRED");
    expect(byId(buildCardBlockReadiness(input({
      visibleContributions: contributions,
      qualities: ["доброта", "забота", "юмор", "поддержка", "надёжность"]
    })), "qualities").status).toBe("READY");
    expect(byId(buildCardBlockReadiness(input({
      visibleContributions: contributions,
      qualities: ["доброта", "забота", "юмор", "поддержка", "надёжность"],
      qualitiesAreStale: true
    })), "qualities").status).toBe("ACTION_REQUIRED");
  });

  it("checks the selected message layout photo requirements", () => {
    const contributions = [{ id: "1" }];
    const card = {
      ...input().card,
      finalMessageSettings: {
        ...input().card.finalMessageSettings!,
        layoutMode: "column-media" as const,
        mediaLayout: "portrait" as const
      }
    };
    expect(byId(buildCardBlockReadiness(input({ card, visibleContributions: contributions })), "messages").status)
      .toBe("WAITING_FOR_CONTENT");
    expect(byId(buildCardBlockReadiness(input({
      card: {
        ...card,
        finalMessageSettings: {
          ...card.finalMessageSettings!,
          mediaAssetIds: ["photo-1"]
        }
      },
      visibleContributions: contributions,
      mediaAssets: [{ id: "photo-1", slot: "portrait" }]
    })), "messages").status).toBe("READY");
  });

  it("marks messages ready with the existing default scheme once content exists", () => {
    expect(byId(buildCardBlockReadiness(input()), "messages").status).toBe("WAITING_FOR_CONTENT");
    expect(byId(buildCardBlockReadiness(input({
      visibleContributions: [{ id: "1" }]
    })), "messages").status).toBe("READY");
  });

  it("distinguishes disabled, waiting and ready moments", () => {
    const disabled = buildCardBlockReadiness(input({
      card: { ...input().card, finalBlockSettings: { ...input().card.finalBlockSettings, memories: false } }
    }));
    expect(byId(disabled, "memories").status).toBe("DISABLED");
    expect(byId(buildCardBlockReadiness(input()), "memories").status).toBe("WAITING_FOR_CONTENT");
    expect(byId(buildCardBlockReadiness(input({
      card: {
        ...input().card,
        finalMemorySettings: {
          ...input().card.finalMemorySettings!,
          mediaAssetIds: ["1", "2", "3"]
        }
      },
      mediaAssets: [
        { id: "1", slot: "memory-a" },
        { id: "2", slot: "memory-b" },
        { id: "3", slot: "memory-c" }
      ]
    })), "memories").status).toBe("READY");
  });

  it("marks best quotes ready only after exactly three valid choices are persisted", () => {
    const contributions = Array.from({ length: 6 }, (_, index) => ({ id: String(index) }));
    const candidates = [
      "Спасибо за поддержку, которая всегда помогает двигаться дальше.",
      "Ты умеешь замечать хорошее даже в самом непростом дне.",
      "Рядом с тобой рабочие будни становятся легче и теплее.",
      "Ты всегда находишь нужные слова, когда они особенно важны."
    ];
    expect(byId(buildCardBlockReadiness(input({
      visibleContributions: contributions,
      bestQuotes: candidates
    })), "quotes").status).toBe("ACTION_REQUIRED");
    expect(byId(buildCardBlockReadiness(input({
      visibleContributions: contributions,
      bestQuotes: candidates.slice(0, 3)
    })), "quotes").status).toBe("READY");
  });

  it("keeps the fallback final block ready under the existing rendering rules", () => {
    expect(byId(buildCardBlockReadiness(input()), "closing").status).toBe("READY");
  });
});

describe("buildOrganizerJourney", () => {
  it("moves from opening the collection to block setup without gating lifecycle", () => {
    const cardInput = input();
    const readiness = buildCardBlockReadiness(cardInput);
    const draft = buildOrganizerJourney({
      card: cardInput.card,
      lifecycle: {
        collectionStatus: "DRAFT",
        deliveryStatus: "PREPARING",
        paymentStatus: "UNPAID"
      },
      blockReadiness: readiness,
      visibleContributionCount: 0
    });
    expect(draft.nextAction.label).toBe("Открыть сбор поздравлений");

    const open = buildOrganizerJourney({
      card: cardInput.card,
      lifecycle: {
        collectionStatus: "OPEN",
        deliveryStatus: "PREPARING",
        paymentStatus: "UNPAID"
      },
      blockReadiness: readiness,
      visibleContributionCount: 0
    });
    expect(open.nextAction.label).toBe("Пригласить участников");
  });

  it("lists real block actions after materials appear", () => {
    const cardInput = input({
      visibleContributions: Array.from({ length: 6 }, (_, index) => ({ id: `greeting-${index + 1}` }))
    });
    const readiness = buildCardBlockReadiness(cardInput);
    const journey = buildOrganizerJourney({
      card: cardInput.card,
      lifecycle: {
        collectionStatus: "OPEN",
        deliveryStatus: "PREPARING",
        paymentStatus: "UNPAID"
      },
      blockReadiness: readiness,
      visibleContributionCount: 6
    });

    expect(journey.currentStepId).toBe("blocks");
    expect(journey.nextAction.label).toBe("Продолжить настройку");
    expect(journey.remainingActions.map((action) => action.target)).toContain("content#greetings-section");
    expect(journey.remainingActions.map((action) => action.target)).toContain("block-qualities");
  });

  it("moves a paid closed card to delivery when all enabled blocks are ready", () => {
    const contribution = { id: "greeting-1" };
    const cardInput = input({
      card: {
        ...input().card,
        finalBlockSettings: {
          summary: true,
          qualities: false,
          memories: false,
          quotes: false
        },
        finalMainGreetingSettings: { contributionId: contribution.id }
      },
      visibleContributions: [contribution]
    });
    const readiness = buildCardBlockReadiness(cardInput);
    const journey = buildOrganizerJourney({
      card: cardInput.card,
      lifecycle: {
        collectionStatus: "CLOSED",
        deliveryStatus: "PREPARING",
        paymentStatus: "PAID"
      },
      blockReadiness: readiness,
      visibleContributionCount: 1
    });

    expect(journey.allBlocksReady).toBe(true);
    expect(journey.currentStepId).toBe("delivery");
    expect(journey.nextAction.label).toBe("Передать получателю");
  });
});
