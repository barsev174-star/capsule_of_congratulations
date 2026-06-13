import { randomBytes, randomUUID } from "node:crypto";
import { logger } from "@/lib/logger";
import { saveCardDraft, saveContribution } from "@/lib/cards/repository";
import type {
  CreateCardInput,
  CreateCardResult,
  CardDraft,
  CreateContributionInput,
  Contribution
} from "@/lib/cards/types";

const slug = (size = 8) => randomBytes(size).toString("hex");

const occasionLabels: Record<CreateCardInput["occasion"], string> = {
  teacher: "учителю",
  caregiver: "воспитателю",
  colleague: "коллеге"
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
    fromLabel: input.fromLabel,
    organizerName: input.organizerName,
    organizerEmail: input.organizerEmail,
    eventDate: input.eventDate ?? null,
    description: input.description ?? null,
    templateId: input.templateId,
    status: "draft",
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now
  };

  await saveCardDraft(card);

  logger.info("funnel.card_created", "Card draft created", {
    cardId: card.id,
    occasion: card.occasion,
    templateId: card.templateId,
    organizerEmail: card.organizerEmail
  });

  const participantLink = `/card/${card.publicSlug}`;
  const manageLink = `/manage/${card.manageToken}`;
  const chatMessage = `Друзья, собираем поздравление ${occasionLabels[card.occasion]} для ${card.recipientName}. Перейдите по ссылке и напишите пару слов — можно с помощью AI, это займет минуту: ${participantLink}`;

  return {
    card,
    participantLink,
    manageLink,
    chatMessage
  };
};

export const createContribution = async (input: CreateContributionInput) => {
  const now = new Date().toISOString();

  const contribution: Contribution = {
    id: randomUUID(),
    cardId: input.cardId,
    authorName: input.authorName,
    authorRole: input.authorRole?.trim() ? input.authorRole.trim() : null,
    message: input.message,
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
