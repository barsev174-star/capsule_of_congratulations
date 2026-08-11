import {
  catalogTemplateRegistrations,
  isRegisteredTemplateId,
  type RegisteredTemplateId,
  type TemplateOccasionId
} from "@/lib/templates/registry";

export type CardTemplateId = RegisteredTemplateId;
export type OccasionId = TemplateOccasionId;

export type CardTemplate = {
  id: CardTemplateId;
  name: string;
  description: string;
  recommendedFor: OccasionId[];
  accent: string;
};

export const cardTemplates: CardTemplate[] = catalogTemplateRegistrations.map((entry) => ({
  id: entry.id as CardTemplateId,
  name: entry.catalog.name,
  description: entry.catalog.description,
  recommendedFor: entry.catalog.recommendedFor,
  accent: entry.catalog.accent
}));

export const occasions = [
  { id: "personal", label: "Личная и теплая" },
  { id: "team", label: "От команды или группы" },
  { id: "celebration", label: "Яркая праздничная" }
] as const satisfies ReadonlyArray<{ id: OccasionId; label: string }>;

const legacyOccasions = ["teacher", "caregiver", "colleague"] as const satisfies ReadonlyArray<OccasionId>;

export const isTemplateId = (value: unknown): value is CardTemplateId =>
  isRegisteredTemplateId(value);

export const isOccasionId = (value: string): value is OccasionId =>
  occasions.some((occasion) => occasion.id === value) ||
  legacyOccasions.some((occasion) => occasion === value);

export const getDefaultTemplateForOccasion = (occasion: OccasionId): CardTemplateId => {
  void occasion;
  return "paper-birthday";
};
