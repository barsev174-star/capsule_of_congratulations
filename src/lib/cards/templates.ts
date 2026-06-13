export type CardTemplateId =
  | "warm-classic"
  | "team-modern"
  | "bright-celebration"
  | "gentle-personal";

export type OccasionId = "teacher" | "caregiver" | "colleague";

export type CardTemplate = {
  id: CardTemplateId;
  name: string;
  description: string;
  recommendedFor: OccasionId[];
  accent: string;
};

export const cardTemplates: CardTemplate[] = [
  {
    id: "warm-classic",
    name: "Теплый классический",
    description: "Спокойный и уважительный стиль для благодарственных открыток.",
    recommendedFor: ["teacher", "caregiver"],
    accent: "#bf6c47"
  },
  {
    id: "team-modern",
    name: "Командный современный",
    description: "Чистый и собранный стиль для коллег и рабочих команд.",
    recommendedFor: ["colleague"],
    accent: "#27566b"
  },
  {
    id: "bright-celebration",
    name: "Праздничный яркий",
    description: "Более заметный и радостный вариант, когда хочется вау-эффекта.",
    recommendedFor: ["teacher", "colleague"],
    accent: "#fb8500"
  },
  {
    id: "gentle-personal",
    name: "Нежный личный",
    description: "Мягкий и душевный визуальный тон с акцентом на личность получателя.",
    recommendedFor: ["caregiver", "teacher"],
    accent: "#b97c73"
  }
];

export const occasions = [
  { id: "teacher", label: "Учителю" },
  { id: "caregiver", label: "Воспитателю" },
  { id: "colleague", label: "Коллеге" }
] as const satisfies ReadonlyArray<{ id: OccasionId; label: string }>;

export const isTemplateId = (value: string): value is CardTemplateId =>
  cardTemplates.some((template) => template.id === value);

export const isOccasionId = (value: string): value is OccasionId =>
  occasions.some((occasion) => occasion.id === value);

export const getDefaultTemplateForOccasion = (occasion: OccasionId): CardTemplateId => {
  if (occasion === "colleague") {
    return "team-modern";
  }

  return "warm-classic";
};
