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
  chatMessage: string;
};
