export const publicShareHeadlinePresets = ["GIFTED_CARD", "THANK_YOU", "LOOK_WHAT_I_GOT"] as const;

export type PublicShareHeadlinePreset = (typeof publicShareHeadlinePresets)[number];
export type PublicCardShareStatus = "DRAFT" | "ACTIVE" | "REVOKED";

export type PublicShareQuality = { id: string; text: string };
export type PublicSharePhrase = { id: string; text: string };

export type PublicCardShare = {
  id: string;
  cardId: string;
  tokenHash: string | null;
  status: PublicCardShareStatus;
  payloadVersion: 1 | 2;
  displayName: string | null;
  showPublicName: boolean;
  headlinePreset: PublicShareHeadlinePreset;
  showOccasion: boolean;
  showEventDate: boolean;
  showGreetingCount: boolean;
  showPhotoCount: boolean;
  publicSummary: string | null;
  publicQualities: PublicShareQuality[];
  publicPhrases: PublicSharePhrase[];
  publicPhraseCandidateIds: string[];
  photoConsentVersion: string | null;
  photoConsentAcceptedAt: string | null;
  publicationConfirmationVersion: string | null;
  publicationConfirmationAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activatedAt: string | null;
  revision: number;
  revokedAt: string | null;
  revokedBy: string | null;
};

export type PublicSharePhraseCandidate = {
  id: string;
  cardId: string;
  text: string;
  sortOrder: number;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicCardSharePhoto = {
  id: string;
  publicShareId: string;
  cardMediaAssetId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  publicCaption: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicShareEditorInput = Pick<
  PublicCardShare,
  | "displayName"
  | "headlinePreset"
  | "showOccasion"
  | "showEventDate"
  | "showGreetingCount"
  | "showPhotoCount"
  | "publicSummary"
  | "publicQualities"
  | "publicPhrases"
> & {
  photoAssetIds: string[];
  photoCaptions: Record<string, string>;
  photoConsentAccepted: boolean;
};

export type PublicSharePayloadV1 = {
  version: 1;
  share: {
    displayName: string | null;
    headlinePreset: PublicShareHeadlinePreset;
    showOccasion: boolean;
    showGreetingCount: boolean;
    showPhotoCount: boolean;
  };
  card: {
    templateId: string;
    occasionText: string | null;
    fromLabel: string | null;
    greetingCount: number;
    photoCount: number;
  };
  summary: string | null;
  qualities: string[];
  phrases: string[];
  photos: Array<{ id: string; url: string; caption: string }>;
};

export type PublicSharePayloadV2 = {
  version: 2;
  family: "universal-v1";
  share: {
    displayName: string | null;
    headlinePreset: PublicShareHeadlinePreset;
    showOccasion: boolean;
    showEventDate: boolean;
    showGreetingCount: boolean;
    showPhotoCount: boolean;
  };
  card: {
    templateId: string;
    occasionText: string | null;
    eventDate: string | null;
    fromLabel: string | null;
    greetingCount: number;
    photoCount: number;
  };
  qualities: string[];
  phrases: string[];
  photos: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    caption: string;
    crop: { x: number; y: number; zoom: number };
  }>;
};

export type PublicSharePayload = PublicSharePayloadV1 | PublicSharePayloadV2;
