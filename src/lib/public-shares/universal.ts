import type { CardMediaAsset } from "@/lib/cards/types";
import type { PublicSharePayloadV2 } from "@/lib/public-shares/types";
import {
  DEFAULT_UNIVERSAL_PUBLIC_HERO_DESCRIPTION,
  type TemplateProfile
} from "@/lib/templates/profile";
import type { UniversalTemplatePhoto, UniversalTemplateViewModel } from "@/lib/templates/view-model";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const toUniversalPhotoCrop = (
  asset: Pick<CardMediaAsset, "cropX" | "cropY" | "cropZoom">
) => ({
  x: clamp((asset.cropX ?? 50) / 100, 0, 1),
  y: clamp((asset.cropY ?? 50) / 100, 0, 1),
  zoom: clamp(asset.cropZoom ?? 1, 1, 3)
});

export type UniversalPublicPayloadInput = {
  templateId: string;
  displayName: string | null;
  headlinePreset: PublicSharePayloadV2["share"]["headlinePreset"];
  showOccasion: boolean;
  showEventDate: boolean;
  showGreetingCount: boolean;
  showPhotoCount: boolean;
  occasionText: string | null;
  eventDate: string | null;
  fromLabel: string | null;
  greetingCount: number;
  photoCount: number;
  qualities: readonly string[];
  phrases: readonly string[];
  photos: ReadonlyArray<{
    id: string;
    url: string;
    width: number;
    height: number;
    caption: string;
    crop: { x: number; y: number; zoom: number };
  }>;
};

export const buildUniversalPublicSharePayload = (
  input: UniversalPublicPayloadInput
): PublicSharePayloadV2 => ({
  version: 2,
  family: "universal-v1",
  share: {
    displayName: input.displayName,
    headlinePreset: input.headlinePreset,
    showOccasion: input.showOccasion,
    showEventDate: input.showEventDate,
    showGreetingCount: input.showGreetingCount,
    showPhotoCount: input.showPhotoCount
  },
  card: {
    templateId: input.templateId,
    occasionText: input.showOccasion ? input.occasionText : null,
    eventDate: input.showEventDate ? input.eventDate : null,
    fromLabel: input.fromLabel,
    greetingCount: input.showGreetingCount ? input.greetingCount : 0,
    photoCount: input.showPhotoCount ? input.photoCount : 0
  },
  qualities: input.qualities.slice(0, 5),
  phrases: input.phrases.slice(0, 3),
  photos: input.photos.slice(0, 3).map((photo) => ({
    ...photo,
    caption: photo.caption.slice(0, 45),
    crop: {
      x: clamp(photo.crop.x, 0, 1),
      y: clamp(photo.crop.y, 0, 1),
      zoom: clamp(photo.crop.zoom, 1, 3)
    }
  }))
});

export const buildUniversalPublicViewModel = (
  payload: PublicSharePayloadV2,
  profile: TemplateProfile
): UniversalTemplateViewModel => {
  const allowed = new Set(profile.public.blocks);
  const photos: UniversalTemplatePhoto[] = payload.photos.map((photo) => ({
    id: photo.id,
    src: photo.url as `/${string}`,
    width: photo.width,
    height: photo.height,
    alt: `Фотография из открытки ${payload.share.displayName ?? "Slovesto"}`,
    caption: photo.caption,
    crop: photo.crop
  }));
  const memories = allowed.has("memories") && photos.length === 3 ? photos : [];

  return {
    templateId: payload.card.templateId,
    recipientName: payload.share.displayName ?? "Открытка Slovesto",
    occasion: payload.card.occasionText ?? "",
    eventDate: payload.card.eventDate,
    fromLabel: payload.card.fromLabel ?? "",
    heroDescription: profile.public.heroDescription?.trim()
      || DEFAULT_UNIVERSAL_PUBLIC_HERO_DESCRIPTION,
    participantCount: payload.card.greetingCount,
    publicPhotoCount: payload.share.showPhotoCount ? payload.card.photoCount : null,
    summaryTitle: "",
    mainGreeting: "",
    qualities: allowed.has("qualities") ? payload.qualities : [],
    contributions: [],
    messageScenario: "grid-2",
    messagePhotos: photos,
    memoryTitle: "Моменты, которые хочется сохранить",
    memoryDescription: "Три фотографии о встречах, улыбках и днях, к которым приятно возвращаться.",
    memoryPhotos: memories,
    privateQuotes: [],
    publicQuotes: allowed.has("quotes") ? payload.phrases : [],
    privateSignature: ""
  };
};
