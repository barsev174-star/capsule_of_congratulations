import type { TemplateProfile } from "@/lib/templates/profile";

export const registeredTemplateIds = [
  "warm-classic",
  "team-modern",
  "bright-celebration",
  "gentle-personal",
  "paper-birthday",
  "route-adventure"
] as const;

export type RegisteredTemplateId = (typeof registeredTemplateIds)[number];

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
};

export type LegacyTemplateRegistration = {
  id: RegisteredTemplateId;
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
  id: RegisteredTemplateId,
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
    accent: "#df4f73"
  }),
  legacy("route-adventure", {
    name: "Маршрут",
    description: "Приключенческая открытка с тёмным лесным фоном, крафтом, картами и воспоминаниями о пути.",
    recommendedFor: ["personal", "team", "celebration", "colleague"],
    accent: "#b08a4a"
  })
]);

export const catalogTemplateRegistrations = templateRegistry.entries.filter(
  (entry): entry is TemplateRegistration & { catalog: TemplateCatalogMetadata } => entry.catalog !== null
);

export const isRegisteredTemplateId = (value: unknown): value is RegisteredTemplateId =>
  typeof value === "string" && registeredTemplateIds.some((id) => id === value);

export const defineUniversalTemplateRegistration = (
  profile: TemplateProfile,
  catalog: TemplateCatalogMetadata
): UniversalTemplateRegistration => ({
  id: profile.id,
  family: "universal-v1",
  profile,
  catalog
});
