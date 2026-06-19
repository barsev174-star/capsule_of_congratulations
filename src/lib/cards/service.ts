import { randomBytes, randomUUID } from "node:crypto";
import { getDefaultTemplateForOccasion } from "@/lib/cards/templates";
import { logger } from "@/lib/logger";
import { saveCardDraft, saveContribution } from "@/lib/cards/repository";
import type {
  CardDraft,
  Contribution,
  CreateCardInput,
  CreateCardResult,
  CreateContributionInput
} from "@/lib/cards/types";

const slug = (size = 8) => randomBytes(size).toString("hex");

const buildDraftLinks = (card: CardDraft): CreateCardResult => {
  const participantLink = `/card/${card.publicSlug}`;
  const manageLink = `/manage/${card.manageToken}`;
  const finalLink = `/gift/${card.finalSlug}`;
  const chatMessage = `Друзья, собираем открытку для ${card.recipientName || "дорогого человека"}. Повод: ${
    card.occasionText || "пока уточняется"
  }. Перейдите по ссылке и напишите пару теплых слов, это займет минуту: ${participantLink}`;

  return {
    card,
    participantLink,
    manageLink,
    finalLink,
    chatMessage
  };
};

export const createCardDraft = async (input: CreateCardInput): Promise<CreateCardResult> => {
  const now = new Date().toISOString();

  const card: CardDraft = {
    id: randomUUID(),
    publicSlug: slug(5),
    manageToken: slug(16),
    finalSlug: slug(6),
    recipientName: input.recipientName,
    occasion: input.occasion,
    occasionText: input.occasionText,
    fromLabel: input.fromLabel,
    organizerName: input.organizerName,
    organizerEmail: input.organizerEmail,
    eventDate: input.eventDate ?? null,
    description: input.description ?? null,
    signature: input.signature ?? null,
    templateId: input.templateId,
    finalBlockSettings: null,
    finalBlockOrder: null,
    finalMessageSettings: null,
    finalMemorySettings: null,
    status: "draft",
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now
  };

  await saveCardDraft(card);

  logger.info("funnel.card_created", "Card draft created", {
    cardId: card.id,
    occasion: card.occasion,
    occasionText: card.occasionText,
    templateId: card.templateId,
    organizerEmail: card.organizerEmail
  });

  return buildDraftLinks(card);
};

export const createEmptyCardDraft = async (): Promise<CreateCardResult> => {
  const now = new Date().toISOString();
  const occasion = "personal";

  const card: CardDraft = {
    id: randomUUID(),
    publicSlug: slug(5),
    manageToken: slug(16),
    finalSlug: slug(6),
    recipientName: "",
    occasion,
    occasionText: "",
    fromLabel: "",
    organizerName: "",
    organizerEmail: "",
    eventDate: null,
    description: null,
    signature: null,
    templateId: getDefaultTemplateForOccasion(occasion),
    finalBlockSettings: null,
    finalBlockOrder: null,
    finalMessageSettings: null,
    finalMemorySettings: null,
    status: "draft",
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now
  };

  await saveCardDraft(card);

  logger.info("funnel.card_created_blank", "Blank card draft created", {
    cardId: card.id,
    occasion: card.occasion,
    templateId: card.templateId
  });

  return buildDraftLinks(card);
};

export const createContribution = async (input: CreateContributionInput) => {
  const now = new Date().toISOString();

  const contribution: Contribution = {
    id: randomUUID(),
    cardId: input.cardId,
    authorName: input.authorName,
    authorRole: input.authorRole?.trim() ? input.authorRole.trim() : null,
    authorAvatarUrl: input.authorAvatarUrl?.trim() ? input.authorAvatarUrl.trim() : null,
    message: input.message,
    sortOrder: Number.NaN,
    status: "visible",
    source: "manual",
    createdAt: now,
    updatedAt: now
  };

  await saveContribution(contribution);

  logger.info("funnel.contribution_created", "Contribution created", {
    cardId: contribution.cardId,
    contributionId: contribution.id,
    source: contribution.source
  });

  return contribution;
};
