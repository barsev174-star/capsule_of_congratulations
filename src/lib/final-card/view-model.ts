import { cardTemplates } from "@/lib/cards/templates";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildFinalCardLayout } from "@/lib/final-card/planner";
import type {
  FinalCardContentAvailability,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardStyleId
} from "@/lib/final-card/types";

export type FinalCardViewModel = {
  style: FinalCardStyleId;
  recipientName: string;
  occasionLabel: string;
  fromLabel: string;
  participantCount: number;
  finalSlug: string;
  summaryTitle: string;
  summaryText: string;
  aiSummaryTitle: string;
  aiSummaryText: string;
  qualities: string[];
  quotes: string[];
  contributions: Contribution[];
  memories: Array<{
    id: string;
    title: string;
    caption: string;
  }>;
  mediaAssets: CardMediaAsset[];
  messageLayoutMode: FinalCardMessageLayoutMode;
  messageMediaLayout: FinalCardMessageMediaLayout;
  showAllMessagesLink: boolean;
  blocks: ReturnType<typeof buildFinalCardLayout>["blocks"];
};

const extractQualities = (contributions: Contribution[]) => {
  const tags = ["доброта", "забота", "внимание", "поддержка", "тепло", "мудрость", "надежность", "вдохновение"];
  const source = contributions.map((item) => item.message.toLowerCase()).join(" ");

  return tags.filter((tag) => source.includes(tag)).slice(0, 5);
};

const extractQuotes = (contributions: Contribution[]) =>
  contributions
    .map((item) => item.message.split(/[.!?]/)[0]?.trim())
    .filter((item): item is string => Boolean(item && item.length > 20))
    .slice(0, 3);

const buildSummaryText = (card: CardDraft, contributions: Contribution[]) => {
  if (card.description) {
    return card.description;
  }

  if (contributions.length === 0) {
    return `Эту открытку для ${card.recipientName} собирает ${card.fromLabel}. Повод: ${card.occasionText}. Скоро здесь появятся теплые слова от всей группы.`;
  }

  return `Эту открытку для ${card.recipientName} уже собрали ${contributions.length} участников. Повод: ${card.occasionText}. Здесь будут жить теплые слова, важные воспоминания и лучшие фразы от ${card.fromLabel}.`;
};

const buildAiSummaryText = (card: CardDraft, contributions: Contribution[]) => {
  if (contributions.length === 0) {
    return "Когда поздравления будут собраны, здесь появится общее теплое резюме от лица всей группы. Пока это заглушка под будущий AI-блок.";
  }

  if (contributions.length === 1) {
    return `Пока здесь только одно поздравление для ${card.recipientName}. Когда сообщений станет больше, мы соберем из них единое общее послание.`;
  }

  return `Здесь позже появится общее поздравление для ${card.recipientName}, собранное по мотивам всех сообщений группы. Пока это аккуратная заглушка под будущий AI-результат.`;
};

const buildMemories = (contributions: Contribution[]) => {
  if (contributions.length === 0) {
    return [];
  }

  return contributions.slice(0, 2).map((item, index) => ({
    id: item.id,
    title: index === 0 ? `Теплый момент от ${item.authorName}` : `Еще одна история от ${item.authorName}`,
    caption: item.message.slice(0, 120)
  }));
};

const resolveStyle = (templateId: CardDraft["templateId"]): FinalCardStyleId => {
  const matched = cardTemplates.find((item) => item.id === templateId);
  return matched?.id ?? "warm-classic";
};

export const buildFinalCardViewModel = (
  card: CardDraft,
  contributions: Contribution[],
  mediaAssets: CardMediaAsset[] = []
): FinalCardViewModel => {
  const style = resolveStyle(card.templateId);
  const messageLayoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const layoutProfile = getFinalCardMessageLayoutProfile(messageLayoutMode);
  const qualities = extractQualities(contributions);
  const quotes = extractQuotes(contributions);
  const memories = buildMemories(contributions);
  const availability: FinalCardContentAvailability = {
    hasSummary: true,
    hasQualities: qualities.length > 0,
    hasMemories: memories.length > 0 || mediaAssets.length > 0,
    hasQuotes: quotes.length > 0,
    hasAiSummary: true
  };

  return {
    style,
    recipientName: card.recipientName,
    occasionLabel: card.occasionText,
    fromLabel: card.fromLabel,
    participantCount: contributions.length,
    finalSlug: card.finalSlug,
    summaryTitle: `${card.recipientName} глазами группы`,
    summaryText: buildSummaryText(card, contributions),
    aiSummaryTitle: "Общее поздравление",
    aiSummaryText: buildAiSummaryText(card, contributions),
    qualities,
    quotes,
    contributions,
    memories,
    mediaAssets,
    messageLayoutMode,
    messageMediaLayout: card.finalMessageSettings?.mediaLayout ?? "portrait",
    showAllMessagesLink: contributions.length > layoutProfile.cardsPerPage,
    blocks: buildFinalCardLayout(style, availability, card.finalBlockSettings).blocks
  };
};
