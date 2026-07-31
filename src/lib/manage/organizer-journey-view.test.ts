import { describe, expect, it } from "vitest";
import type { OrganizerJourneyStep } from "./card-design-readiness";
import { buildOrganizerJourneyCompactView } from "./organizer-journey-view";

const steps: OrganizerJourneyStep[] = [
  {
    id: "basics",
    label: "Заполнить основу",
    description: "Получатель, повод и автор открытки",
    status: "COMPLETED"
  },
  {
    id: "design",
    label: "Выбрать оформление",
    description: "Шаблон открытки",
    status: "COMPLETED"
  },
  {
    id: "collection",
    label: "Открыть сбор",
    description: "Ссылка для участников",
    status: "CURRENT"
  },
  {
    id: "materials",
    label: "Собрать поздравления и фото",
    description: "Поздравления и фотографии участников",
    status: "UPCOMING"
  },
  {
    id: "blocks",
    label: "Настроить открытку",
    description: "Состав финальной открытки",
    status: "UPCOMING"
  },
  {
    id: "delivery",
    label: "Оплатить и передать",
    description: "Финальная проверка и передача",
    status: "UPCOMING"
  }
];

describe("buildOrganizerJourneyCompactView", () => {
  it("keeps the last completed steps, current step, next step and factual remainder", () => {
    const view = buildOrganizerJourneyCompactView(steps);

    expect(view.completedSteps.map((step) => step.id)).toEqual(["basics", "design"]);
    expect(view.currentStep.id).toBe("collection");
    expect(view.nextStep?.id).toBe("materials");
    expect(view.remainingSteps.map((step) => step.id)).toEqual(["blocks", "delivery"]);
    expect(view.remainingSummary).toBe(
      "Ещё 2 этапа: настроить открытку, затем оплатить и передать"
    );
  });

  it("uses the final step as current when the whole journey is completed", () => {
    const completed = steps.map((step) => ({ ...step, status: "COMPLETED" as const }));
    const view = buildOrganizerJourneyCompactView(completed);

    expect(view.currentStep.id).toBe("delivery");
    expect(view.nextStep).toBeNull();
    expect(view.remainingSummary).toBeNull();
  });
});
