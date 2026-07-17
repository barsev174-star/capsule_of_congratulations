export type CardTemplateId =
  | "warm-classic"
  | "team-modern"
  | "bright-celebration"
  | "gentle-personal"
  | "paper-birthday"
  | "route-adventure";

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
    id: "route-adventure",
    name: "Маршрут",
    description: "Приключенческая открытка с тёмным лесным фоном, крафтом, картами и воспоминаниями о пути.",
    recommendedFor: ["personal", "team", "celebration", "colleague"],
    accent: "#b08a4a"
  }
];

const legacyTemplateIds = ["warm-classic", "team-modern", "bright-celebration", "gentle-personal"] as const;

export const occasions = [
  { id: "personal", label: "Личная и теплая" },
  { id: "team", label: "От команды или группы" },
  { id: "celebration", label: "Яркая праздничная" }
] as const satisfies ReadonlyArray<{ id: OccasionId; label: string }>;

const legacyOccasions = ["teacher", "caregiver", "colleague"] as const satisfies ReadonlyArray<OccasionId>;

export const isTemplateId = (value: string): value is CardTemplateId =>
  cardTemplates.some((template) => template.id === value) ||
  legacyTemplateIds.some((templateId) => templateId === value);

export const isOccasionId = (value: string): value is OccasionId =>
  occasions.some((occasion) => occasion.id === value) ||
  legacyOccasions.some((occasion) => occasion === value);

export const getDefaultTemplateForOccasion = (occasion: OccasionId): CardTemplateId => {
  void occasion;
  return "paper-birthday";
};
