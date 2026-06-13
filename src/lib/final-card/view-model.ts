import { cardTemplates } from "@/lib/cards/templates";
import type { CardDraft, Contribution } from "@/lib/cards/types";
import { buildFinalCardLayout } from "@/lib/final-card/planner";
import type { FinalCardContentAvailability, FinalCardStyleId } from "@/lib/final-card/types";

export type FinalCardViewModel = {
  style: FinalCardStyleId;
  recipientName: string;
  occasionLabel: string;
  fromLabel: string;
  participantCount: number;
  summaryTitle: string;
  summaryText: string;
  qualities: string[];
  quotes: string[];
  contributions: Contribution[];
  memories: Array<{
    id: string;
    title: string;
    caption: string;
  }>;
  blocks: ReturnType<typeof buildFinalCardLayout>["blocks"];
};

const occasionLabelMap = {
  teacher: "с теплым праздником",
  caregiver: "с теплым праздником",
  colleague: "с важным днем"
} as const;

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
    return `Эту открытку для ${card.recipientName} собирает ${card.fromLabel}. Скоро здесь появятся теплые слова от всей группы.`;
  }

  return `Эту открытку для ${card.recipientName} уже собрали ${contributions.length} участников. Здесь будут жить теплые слова, важные воспоминания и лучшие фразы от ${card.fromLabel}.`;
};

const buildMemories = (card: CardDraft, contributions: Contribution[]) => {
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

  if (!matched) {
    return "warm-classic";
  }

  return matched.id;
};

export const buildFinalCardViewModel = (card: CardDraft, contributions: Contribution[]): FinalCardViewModel => {
  const style = resolveStyle(card.templateId);
  const qualities = extractQualities(contributions);
  const quotes = extractQuotes(contributions);
  const memories = buildMemories(card, contributions);
  const availability: FinalCardContentAvailability = {
    hasSummary: true,
    hasQualities: qualities.length > 0,
    hasMemories: memories.length > 0,
    hasQuotes: quotes.length > 0
  };

  return {
    style,
    recipientName: card.recipientName,
    occasionLabel: occasionLabelMap[card.occasion],
    fromLabel: card.fromLabel,
    participantCount: contributions.length,
    summaryTitle: `${card.recipientName} глазами группы`,
    summaryText: buildSummaryText(card, contributions),
    qualities,
    quotes,
    contributions,
    memories,
    blocks: buildFinalCardLayout(style, availability).blocks
  };
};
