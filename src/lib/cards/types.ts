import type { CardTemplateId, OccasionId } from "@/lib/cards/templates";

export type CardStatus = "draft";
export type PaymentStatus = "unpaid";

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
  templateId: CardTemplateId;
  status: CardStatus;
  paymentStatus: PaymentStatus;
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
export type ContributionSource = "manual";

export type Contribution = {
  id: string;
  cardId: string;
  authorName: string;
  authorRole: string | null;
  message: string;
  status: ContributionStatus;
  source: ContributionSource;
  createdAt: string;
  updatedAt: string;
};

export type CreateContributionInput = {
  cardId: string;
  authorName: string;
  authorRole?: string;
  message: string;
};

export type ContributionStatusUpdate = {
  contributionId: string;
  status: Exclude<ContributionStatus, "visible"> | "visible";
};

export type ContributionMessageUpdate = {
  contributionId: string;
  message: string;
};
