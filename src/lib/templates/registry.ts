import type { TemplateProfile } from "@/lib/templates/profile";
import {
  generatedUniversalTemplateIds,
  generatedUniversalTemplateRegistrations,
  type GeneratedUniversalTemplateId
} from "@/lib/templates/generated-registry";

export const legacyTemplateRegistrationIds = [
  "warm-classic",
  "team-modern",
  "bright-celebration",
  "gentle-personal",
  "paper-birthday",
  "route-adventure"
] as const;

export const registeredTemplateIds = [
  ...legacyTemplateRegistrationIds,
  ...generatedUniversalTemplateIds
] as const;

export type RegisteredTemplateId = (typeof legacyTemplateRegistrationIds)[number] | GeneratedUniversalTemplateId;
type LegacyTemplateRegistrationId = (typeof legacyTemplateRegistrationIds)[number];

export type TemplateOccasionId =
  | "personal"
  | "team"
  | "celebration"
  | "teacher"
  | "caregiver"
  | "colleague";

export type TemplateCatalogMetadata = {
  name: string;
  description: string;
  recommendedFor: TemplateOccasionId[];
  accent: string;
  availability: "studio" | "product";
};

export type LegacyTemplateRegistration = {
  id: LegacyTemplateRegistrationId;
  family: "legacy";
  renderer: "final-card-legacy";
  exportRenderer: "public-share-image-legacy";
  catalog: TemplateCatalogMetadata | null;
};

export type UniversalTemplateRegistration = {
  id: string;
  family: "universal-v1";
  profile: TemplateProfile;
  catalog: TemplateCatalogMetadata;
};

export type TemplateRegistration = LegacyTemplateRegistration | UniversalTemplateRegistration;

export type TemplateRegistry = {
  entries: readonly TemplateRegistration[];
  get: (id: string) => TemplateRegistration | undefined;
};

export const createTemplateRegistry = (entries: readonly TemplateRegistration[]): TemplateRegistry => {
  const byId = new Map<string, TemplateRegistration>();
  for (const entry of entries) {
    if (byId.has(entry.id)) {
      throw new Error(`Шаблон ${entry.id} зарегистрирован повторно.`);
    }
    if (entry.family === "universal-v1" && entry.profile.id !== entry.id) {
      throw new Error(`ID профиля ${entry.profile.id} не совпадает с регистрацией ${entry.id}.`);
    }
    byId.set(entry.id, entry);
  }

  return {
    entries: [...entries],
    get: (id: string) => byId.get(id)
  };
};

const legacy = (
  id: LegacyTemplateRegistrationId,
  catalog: TemplateCatalogMetadata | null = null
): LegacyTemplateRegistration => ({
  id,
  family: "legacy",
  renderer: "final-card-legacy",
  exportRenderer: "public-share-image-legacy",
  catalog
});

export const templateRegistry = createTemplateRegistry([
  legacy("warm-classic"),
  legacy("team-modern"),
  legacy("bright-celebration"),
  legacy("gentle-personal"),
  legacy("paper-birthday", {
    name: "Бумажный классический",
    description: "Праздничная открытка с бумажными листами, скотчем, полароидами и рукописным настроением.",
    recommendedFor: ["personal", "celebration", "colleague"],
    accent: "#df4f73",
    availability: "product"
  }),
  legacy("route-adventure", {
    name: "Маршрут",
    description: "Приключенческая открытка с тёмным лесным фоном, крафтом, картами и воспоминаниями о пути.",
    recommendedFor: ["personal", "team", "celebration", "colleague"],
    accent: "#b08a4a",
    availability: "product"
  }),
  ...generatedUniversalTemplateRegistrations
]);

export const catalogTemplateRegistrations = templateRegistry.entries.filter(
  (entry): entry is TemplateRegistration & { catalog: TemplateCatalogMetadata } =>
    entry.catalog?.availability === "product"
);

export const studioTemplateRegistrations = templateRegistry.entries.filter(
  (entry): entry is UniversalTemplateRegistration => entry.family === "universal-v1"
);

export const isRegisteredTemplateId = (value: unknown): value is RegisteredTemplateId =>
  typeof value === "string" && registeredTemplateIds.some((id) => id === value);

export const isProductTemplateId = (value: unknown): value is RegisteredTemplateId => {
  if (!isRegisteredTemplateId(value)) return false;
  const registration = templateRegistry.get(value);
  return registration?.family === "legacy" || registration?.catalog.availability === "product";
};

export const defineUniversalTemplateRegistration = (
  profile: TemplateProfile,
  catalog: TemplateCatalogMetadata
): UniversalTemplateRegistration => ({
  id: profile.id,
  family: "universal-v1",
  profile,
  catalog
});
