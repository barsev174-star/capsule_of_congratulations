import type { CardTemplateId, OccasionId } from "@/lib/cards/templates";
import type {
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMainGreetingSettings,
  FinalCardMemorySettings,
  FinalCardMessageSettings
} from "@/lib/final-card/types";

/** @deprecated Compatibility label derived from the independent lifecycle statuses. */
export type CardStatus = "draft" | "collecting" | "ready" | "closed" | "published";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "REVOKED";
export type CollectionStatus = "DRAFT" | "OPEN" | "CLOSED";
export type DeliveryStatus = "PREPARING" | "DELIVERED";

export type CardDraft = {
  id: string;
  publicSlug: string;
  manageToken: string;
  finalSlug: string;
  recipientName: string;
  occasion: OccasionId;
  occasionText: string;
  fromLabel: string;
  organizerName: string;
  organizerEmail: string;
  eventDate: string | null;
  description: string | null;
  signature: string | null;
  templateId: CardTemplateId;
  finalBlockSettings: FinalCardBlockSettings | null;
  finalBlockOrder: FinalCardBlockOrder | null;
  finalMessageSettings: FinalCardMessageSettings | null;
  finalMainGreetingSettings: FinalCardMainGreetingSettings | null;
  finalMemorySettings: FinalCardMemorySettings | null;
  status: CardStatus;
  paymentStatus: PaymentStatus;
  collectionStatus?: CollectionStatus;
  deliveryStatus?: DeliveryStatus;
  paidAt?: string | null;
  collectionOpenedAt?: string | null;
  collectionClosedAt?: string | null;
  deliveredAt?: string | null;
  recipientFirstOpenedAt?: string | null;
  refundedAt?: string | null;
  revokedAt?: string | null;
  isHidden?: boolean;
  hiddenAt?: string | null;
  purgedAt?: string | null;
  activePaidOrderId?: string | null;
  activeAccessGrantId?: string | null;
  repurchaseAllowedAt?: string | null;
  repurchaseExpiresAt?: string | null;
  repurchaseUsedAt?: string | null;
  repurchaseAllowedByAdminId?: string | null;
  deletedAt: string | null;
  purgeAt: string | null;
  /** @deprecated Replaced by purgeAt during the production migration. */
  purgeAfter?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCardInput = {
  recipientName: string;
  occasion: OccasionId;
  occasionText: string;
  fromLabel: string;
  organizerName: string;
  organizerEmail: string;
  eventDate?: string;
  description?: string;
  signature?: string;
  templateId: CardTemplateId;
};

export type CreateCardResult = {
  card: CardDraft;
  participantLink: string;
  manageLink: string;
  finalLink: string;
  chatMessage: string;
};

export type ContributionStatus = "visible" | "hidden" | "deleted";
export type ContributionSource = "manual" | "participant";
export type CardMediaSlot =
  | "portrait"
  | "landscape-a"
  | "landscape-b"
  | "landscape-c"
  | "memory-a"
  | "memory-b"
  | "memory-c";

export type Contribution = {
  id: string;
  cardId: string;
  authorName: string;
  authorRole: string | null;
  authorAvatarUrl: string | null;
  message: string;
  sortOrder: number;
  status: ContributionStatus;
  source: ContributionSource;
  participantTokenHash?: string | null;
  consentVersion?: string | null;
  consentAcceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateContributionInput = {
  cardId: string;
  authorName: string;
  authorRole?: string;
  authorAvatarUrl?: string;
  message: string;
  source?: ContributionSource;
  participantTokenHash?: string;
  consentVersion?: string;
  consentAcceptedAt?: string;
};

export type ContributionStatusUpdate = {
  contributionId: string;
  status: Exclude<ContributionStatus, "visible"> | "visible";
};

export type ContributionMessageUpdate = {
  contributionId: string;
  message: string;
};

export type CardMediaAsset = {
  id: string;
  cardId: string;
  slot: CardMediaSlot;
  publicUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  captionTitle: string;
  captionSubtitle: string;
  createdAt: string;
  updatedAt: string;
  rightsConsentVersion?: string | null;
  rightsConfirmedAt?: string | null;
};
