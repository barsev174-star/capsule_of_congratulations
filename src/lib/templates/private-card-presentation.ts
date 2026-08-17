import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import type {
  UniversalTemplatePhoto,
  UniversalTemplateViewModel
} from "@/lib/templates/view-model";

type FinalCardAiContent = Parameters<typeof buildFinalCardViewModel>[3];
type FinalCardBuildOptions = Parameters<typeof buildFinalCardViewModel>[4];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toUniversalPhoto = (
  asset: CardMediaAsset,
  recipientName: string
): UniversalTemplatePhoto => ({
  id: asset.id,
  src: asset.publicUrl as `/${string}`,
  width: asset.imageWidth ?? 1600,
  height: asset.imageHeight ?? 1200,
  alt: asset.captionTitle || asset.captionSubtitle || `Фотография для открытки ${recipientName}`,
  caption: (asset.captionSubtitle || asset.captionTitle || "Фото для открытки").slice(0, 45),
  crop: {
    x: clamp((asset.cropX ?? 50) / 100, 0, 1),
    y: clamp((asset.cropY ?? 50) / 100, 0, 1),
    zoom: clamp(asset.cropZoom ?? 1, 1, 3)
  }
});

export const buildPrivateCardPresentation = (
  card: CardDraft,
  contributions: Contribution[],
  mediaAssets: CardMediaAsset[] = [],
  aiContent: FinalCardAiContent = {},
  options: FinalCardBuildOptions = {}
) => {
  if (!card.templateId) return null;
  const dispatch = dispatchTemplateRenderer(card.templateId);
  if (!dispatch) return null;

  const finalModel = buildFinalCardViewModel(card, contributions, mediaAssets, aiContent, options);
  if (dispatch.kind === "legacy") {
    return { kind: "legacy" as const, dispatch, model: finalModel };
  }

  const messageScenario = finalModel.messageLayoutMode === "column-media"
    ? finalModel.messageMediaLayout
    : finalModel.messageLayoutMode;
  const model: UniversalTemplateViewModel = {
    templateId: dispatch.registration.id,
    recipientName: finalModel.recipientName,
    occasion: finalModel.occasionLabel,
    eventDate: card.eventDate,
    fromLabel: finalModel.fromLabel,
    heroDescription: "Тёплые слова, яркие моменты и пожелания специально для тебя.",
    participantCount: finalModel.participantCount,
    publicPhotoCount: null,
    summaryTitle: finalModel.summaryTitle,
    mainGreeting: finalModel.summaryText,
    mainGreetingAuthorName: finalModel.mainGreetingAuthorName,
    qualities: finalModel.qualities,
    contributions: finalModel.contributions.map((contribution) => ({
      id: contribution.id,
      authorName: contribution.authorName,
      authorRole: contribution.authorRole ?? undefined,
      avatarUrl: contribution.authorAvatarUrl,
      message: contribution.message
    })),
    messageScenario,
    messagePhotos: finalModel.messageMediaAssets.map((asset) => toUniversalPhoto(asset, finalModel.recipientName)),
    memoryTitle: finalModel.memoryTitle,
    memoryDescription: finalModel.memoryDescription,
    memoryPhotos: finalModel.memoryMediaAssets.map((asset) => toUniversalPhoto(asset, finalModel.recipientName)),
    privateQuotes: finalModel.quotes,
    publicQuotes: [],
    privateSignature: finalModel.footerSignature
  };

  return { kind: "universal-v1" as const, dispatch, model };
};
