import type { OrganizerJourneyStep } from "./card-design-readiness";

export type OrganizerJourneyCompactView = {
  completedSteps: OrganizerJourneyStep[];
  currentStep: OrganizerJourneyStep;
  nextStep: OrganizerJourneyStep | null;
  remainingSteps: OrganizerJourneyStep[];
  remainingSummary: string | null;
};

const lowerFirst = (value: string) =>
  value.length > 0 ? `${value[0].toLocaleLowerCase("ru-RU")}${value.slice(1)}` : value;

const joinRussianList = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]}, затем ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, затем ${items.at(-1)}`;
};

const stageWord = (count: number) => {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return "этапов";
  if (mod10 === 1) return "этап";
  if (mod10 >= 2 && mod10 <= 4) return "этапа";
  return "этапов";
};

export const buildOrganizerJourneyCompactView = (
  steps: OrganizerJourneyStep[]
): OrganizerJourneyCompactView => {
  if (steps.length === 0) {
    throw new Error("Organizer journey must contain at least one step.");
  }

  const completedSteps = steps.filter((step) => step.status === "COMPLETED").slice(-2);
  const currentStep =
    steps.find((step) => step.status === "CURRENT") ??
    steps[steps.length - 1];
  const currentIndex = steps.findIndex((step) => step.id === currentStep.id);
  const nextStep =
    steps.slice(currentIndex + 1).find((step) => step.status === "UPCOMING") ?? null;
  const nextIndex = nextStep
    ? steps.findIndex((step) => step.id === nextStep.id)
    : currentIndex;
  const remainingSteps = steps
    .slice(nextIndex + 1)
    .filter((step) => step.status !== "COMPLETED");
  const remainingSummary =
    remainingSteps.length > 0
      ? `Ещё ${remainingSteps.length} ${stageWord(remainingSteps.length)}: ${joinRussianList(
          remainingSteps.map((step) => lowerFirst(step.label))
        )}`
      : null;

  return {
    completedSteps,
    currentStep,
    nextStep,
    remainingSteps,
    remainingSummary
  };
};
