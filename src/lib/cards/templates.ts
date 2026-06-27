export type CardTemplateId =
  | "warm-classic"
  | "team-modern"
  | "bright-celebration"
  | "gentle-personal"
  | "paper-birthday";

export type OccasionId =
  | "personal"
  | "team"
  | "celebration"
  | "teacher"
  | "caregiver"
  | "colleague";

export type CardTemplate = {
  id: CardTemplateId;
  name: string;
  description: string;
  recommendedFor: OccasionId[];
  accent: string;
};

export const cardTemplates: CardTemplate[] = [
  {
    id: "paper-birthday",
    name: "Бумажный классический",
    description: "Праздничная открытка с бумажными листами, скотчем, полароидами и рукописным настроением.",
    recommendedFor: ["personal", "celebration", "colleague"],
    accent: "#df4f73"
  },
  {
    id: "warm-classic",
    name: "Тёплый классический",
    description: "Кремовая бумага, мягкая типографика, конверт, сухоцветы и тёплые акценты.",
    recommendedFor: ["personal", "teacher", "caregiver"],
    accent: "#bf6c47"
  },
  {
    id: "team-modern",
    name: "Командный современный",
    description: "Темный аккуратный стиль для сильной командной открытки без лишнего шума.",
    recommendedFor: ["team", "colleague"],
    accent: "#27566b"
  },
  {
    id: "bright-celebration",
    name: "Праздничный яркий",
    description: "Смелый праздничный стиль с энергией, наклейками и яркими акцентами.",
    recommendedFor: ["celebration", "teacher", "colleague"],
    accent: "#fb8500"
  },
  {
    id: "gentle-personal",
    name: "Нежный личный",
    description: "Воздушная открытка с природными деталями и мягкой атмосферой близости.",
    recommendedFor: ["personal", "caregiver", "teacher"],
    accent: "#b97c73"
  }
];

export const occasions = [
  { id: "personal", label: "Личная и теплая" },
  { id: "team", label: "От команды или группы" },
  { id: "celebration", label: "Яркая праздничная" }
] as const satisfies ReadonlyArray<{ id: OccasionId; label: string }>;

const legacyOccasions = ["teacher", "caregiver", "colleague"] as const satisfies ReadonlyArray<OccasionId>;

export const isTemplateId = (value: string): value is CardTemplateId =>
  cardTemplates.some((template) => template.id === value);

export const isOccasionId = (value: string): value is OccasionId =>
  occasions.some((occasion) => occasion.id === value) ||
  legacyOccasions.some((occasion) => occasion === value);

export const getDefaultTemplateForOccasion = (occasion: OccasionId): CardTemplateId => {
  if (occasion === "team" || occasion === "colleague") {
    return "team-modern";
  }

  if (occasion === "celebration") {
    return "bright-celebration";
  }

  return "warm-classic";
};
