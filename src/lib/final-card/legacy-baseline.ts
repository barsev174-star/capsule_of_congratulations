import { exampleCardModel, routeAdventureDemoCardModel } from "@/lib/example-card";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import type { PublicSharePayloadV1 } from "@/lib/public-shares/types";

export const legacyTemplateIds = ["paper-birthday", "route-adventure"] as const;
export type LegacyTemplateId = (typeof legacyTemplateIds)[number];

export const legacyMessageScenarios = [
  "grid-2",
  "carousel-1",
  "carousel-2",
  "portrait",
  "landscape-pair",
  "landscape-trio"
] as const;
export type LegacyMessageScenario = (typeof legacyMessageScenarios)[number];

const scenarioSettings: Record<
  LegacyMessageScenario,
  Pick<FinalCardViewModel, "messageLayoutMode" | "messageMediaLayout"> & { photoCount: number }
> = {
  "grid-2": { messageLayoutMode: "grid-2", messageMediaLayout: "portrait", photoCount: 0 },
  "carousel-1": { messageLayoutMode: "carousel-1", messageMediaLayout: "portrait", photoCount: 0 },
  "carousel-2": { messageLayoutMode: "carousel-2", messageMediaLayout: "portrait", photoCount: 0 },
  portrait: { messageLayoutMode: "column-media", messageMediaLayout: "portrait", photoCount: 1 },
  "landscape-pair": { messageLayoutMode: "column-media", messageMediaLayout: "landscape-pair", photoCount: 2 },
  "landscape-trio": { messageLayoutMode: "column-media", messageMediaLayout: "landscape-trio", photoCount: 3 }
};

export const isLegacyTemplateId = (value: unknown): value is LegacyTemplateId =>
  typeof value === "string" && legacyTemplateIds.some((templateId) => templateId === value);

export const isLegacyMessageScenario = (value: unknown): value is LegacyMessageScenario =>
  typeof value === "string" && legacyMessageScenarios.some((scenario) => scenario === value);

export const buildLegacyBaselineModel = (
  templateId: LegacyTemplateId,
  scenario: LegacyMessageScenario
): FinalCardViewModel => {
  const source = templateId === "route-adventure" ? routeAdventureDemoCardModel : exampleCardModel;
  const settings = scenarioSettings[scenario];

  return {
    ...source,
    messageLayoutMode: settings.messageLayoutMode,
    messageMediaLayout: settings.messageMediaLayout,
    messageMediaAssets: source.messageMediaAssets.slice(0, settings.photoCount),
    showAllMessagesLink: false
  };
};

export const getLegacyExportBaselineToken = (templateId: LegacyTemplateId) =>
  `__legacy-baseline-${templateId}__`;

export const getLegacyTemplateIdFromExportBaselineToken = (token: string): LegacyTemplateId | null => {
  const templateId = legacyTemplateIds.find((candidate) => getLegacyExportBaselineToken(candidate) === token);
  return templateId ?? null;
};

export const buildLegacyExportBaselinePayload = (templateId: LegacyTemplateId): PublicSharePayloadV1 => {
  const model = buildLegacyBaselineModel(templateId, "landscape-trio");

  return {
    version: 1,
    share: {
      displayName: model.recipientName,
      headlinePreset: "GIFTED_CARD",
      showOccasion: true,
      showGreetingCount: true,
      showPhotoCount: true
    },
    card: {
      templateId,
      occasionText: model.occasionLabel,
      fromLabel: model.fromLabel,
      greetingCount: model.participantCount,
      photoCount: model.mediaAssets.length
    },
    summary: model.summaryText,
    qualities: model.qualities.slice(0, 5),
    phrases: model.quotes.slice(0, 3),
    photos: model.memoryMediaAssets.slice(0, 3).map((photo) => ({
      id: photo.id,
      url: photo.publicUrl,
      caption: photo.captionTitle || photo.captionSubtitle || ""
    }))
  };
};
