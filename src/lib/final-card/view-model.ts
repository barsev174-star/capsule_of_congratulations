import { BEST_QUOTE_COUNT, isValidBestQuoteText } from "@/lib/ai/card-insights";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { resolveMainGreetingContribution } from "@/lib/final-card/main-greeting";
import {
  getMemoryMediaSlots,
  getMessageMediaSlots,
  resolveAssignedMediaAssets
} from "@/lib/final-card/media-assignments";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildFinalCardLayout } from "@/lib/final-card/planner";
import type {
  FinalCardContentAvailability,
  FinalCardAiContent,
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout,
  FinalCardStyleId
} from "@/lib/final-card/types";
import { templateRegistry } from "@/lib/templates/registry";

export type FinalCardViewModel = {
  style: FinalCardStyleId;
  recipientName: string;
  occasionLabel: string;
  fromLabel: string;
  heroDescription: string | null;
  participantCount: number;
  /** Public-page-only aggregate metadata. It never contains private media or text. */
  publicPhotoCount?: number | null;
  publicFullCardHasPhotos?: boolean;
  finalSlug: string;
  summaryTitle: string;
  summaryText: string;
  mainGreetingContributionId: string | null;
  mainGreetingAuthorName: string | null;
  qualities: string[];
  quotes: string[];
  contributions: Contribution[];
  memories: Array<{
    id: string;
    title: string;
    caption: string;
  }>;
  mediaAssets: CardMediaAsset[];
  messageMediaAssets: CardMediaAsset[];
  memoryMediaAssets: CardMediaAsset[];
  memoryTitle: string;
  memoryDescription: string;
  memoryPhotoCount: 2 | 3;
  messageLayoutMode: FinalCardMessageLayoutMode;
  messageMediaLayout: FinalCardMessageMediaLayout;
  showAllMessagesLink: boolean;
  footerSignature: string;
  blocks: ReturnType<typeof buildFinalCardLayout>["blocks"];
};

const DEFAULT_MEMORY_TITLE = "Моменты";
const DEFAULT_MEMORY_DESCRIPTION = "Фото, которые хочется сохранить";
const LEGACY_MEMORY_TITLE = "Наши воспоминания";
const LEGACY_MEMORY_DESCRIPTION = "Столько ярких моментов, с которыми мы идём рядом с тобой.";

const extractQualities = (contributions: Contribution[]) => {
  const qualityKeywords: Record<string, string[]> = {
    доброта: ["добр", "доброт"],
    забота: ["забот"],
    надежность: ["надеж", "надёж"],
    вдохновение: ["вдохнов"],
    поддержка: ["поддерж"],
    тепло: ["тепл", "тёпл"],
    юмор: ["юмор", "весел", "весёл"],
    искренность: ["искрен"],
    энергия: ["энерг"],
    мудрость: ["мудр"],
    внимание: ["вниматель", "внимание"],
    свет: ["светл", "свет"],
    спокойствие: ["спокой"],
    радость: ["радост", "радость"]
  };
  const source = contributions.map((item) => item.message.toLowerCase()).join(" ");

  const matched = Object.entries(qualityKeywords)
    .filter(([, keywords]) => keywords.some((keyword) => source.includes(keyword)))
    .map(([quality]) => quality);

  const fallback = ["доброта", "забота", "тепло", "поддержка", "искренность"];
  const unique = Array.from(new Set([...matched, ...fallback]));
  return unique.slice(0, 5);
};

const getGenderSuffix = (name: string) => {
  const femaleEndings = ["а", "я", "ия", "ея"];
  const trimmed = name.trim().toLowerCase();
  return femaleEndings.some((ending) => trimmed.endsWith(ending)) ? "ая" : "ой";
};

const extractQuotes = (contributions: Contribution[]) => {
  const quotes = contributions
    .map((item) => item.message.split(/[.!?]/)[0]?.trim())
    .filter((item): item is string => Boolean(item && isValidBestQuoteText(item)));

  return quotes.length >= BEST_QUOTE_COUNT ? quotes.slice(0, BEST_QUOTE_COUNT) : [];
};

const buildSummaryText = (card: CardDraft, contributions: Contribution[]) => {
  if (card.description) {
    return card.description;
  }

  if (contributions.length === 0) {
    return `Дорог${getGenderSuffix(card.recipientName)} ${card.recipientName}!\n\nСкоро здесь появятся теплые слова от ${card.fromLabel}. Мы готовим для тебя особенную открытку по случаю «${card.occasionText}».`;
  }

  return `Дорог${getGenderSuffix(card.recipientName)} ${card.recipientName}!\n\nМы, ${card.fromLabel}, собрались, чтобы поздравить тебя с ${card.occasionText}. Каждое слово в этой открытке — от сердца к сердцу.`;
};

const trimMainGreetingText = (value: string) => {
  const normalized = value.trim();

  if (normalized.length <= 500) {
    return normalized;
  }

  return `${normalized.slice(0, 499).trimEnd()}…`;
};

const normalizeMemoryTitle = (value: string | null | undefined) => {
  const title = value?.trim();
  return !title || title === LEGACY_MEMORY_TITLE ? DEFAULT_MEMORY_TITLE : title;
};

const normalizeMemoryDescription = (value: string | null | undefined) => {
  const description = value?.trim();
  return !description || description === LEGACY_MEMORY_DESCRIPTION ? DEFAULT_MEMORY_DESCRIPTION : description;
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
  if (!templateId) return "warm-classic";
  const registration = templateRegistry.get(templateId);
  return registration?.family === "legacy" ? registration.id : "warm-classic";
};

export const buildFinalCardViewModel = (
  card: CardDraft,
  contributions: Contribution[],
  mediaAssets: CardMediaAsset[] = [],
  aiContent: FinalCardAiContent = {},
  options: { includeIncompleteBlocks?: boolean } = {}
): FinalCardViewModel => {
  const normalizedMediaAssets = mediaAssets.map((asset) => ({
    ...asset,
    captionSubtitle: asset.captionTitle || asset.captionSubtitle
  }));
  const style = resolveStyle(card.templateId);
  const messageLayoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const messageMediaLayout = card.finalMessageSettings?.mediaLayout ?? "portrait";
  const layoutProfile = getFinalCardMessageLayoutProfile(messageLayoutMode, messageMediaLayout);
  const qualities = aiContent.qualities?.length === 5 ? aiContent.qualities.slice(0, 5) : [];
  const quotes = aiContent.quotes?.length === BEST_QUOTE_COUNT && aiContent.quotes.every(isValidBestQuoteText)
      ? aiContent.quotes
      : [];
  const memories = buildMemories(contributions);
  const mainGreeting = resolveMainGreetingContribution(card, contributions);
  const visibleMessageContributions = mainGreeting
    ? contributions.filter((contribution) => contribution.id !== mainGreeting.id)
    : contributions;
  const availability: FinalCardContentAvailability = {
    hasSummary: true,
    hasQualities: qualities.length > 0,
    hasMemories: true,
    hasQuotes: quotes.length === BEST_QUOTE_COUNT
  };

  return {
    style,
    recipientName: card.recipientName,
    occasionLabel: card.occasionText,
    fromLabel: card.fromLabel,
    heroDescription: null,
    participantCount: contributions.length,
    finalSlug: card.finalSlug,
    summaryTitle: "Самые важные слова",
    summaryText: mainGreeting ? trimMainGreetingText(mainGreeting.message) : buildSummaryText(card, contributions),
    mainGreetingContributionId: mainGreeting?.id ?? null,
    mainGreetingAuthorName: mainGreeting?.authorName ?? null,
    qualities,
    quotes,
    contributions: visibleMessageContributions,
    memories,
    mediaAssets: normalizedMediaAssets,
    messageMediaAssets: resolveAssignedMediaAssets(
      normalizedMediaAssets,
      card.finalMessageSettings?.mediaAssetIds ?? [],
      card.deliveryStatus === "DELIVERED"
        ? (card.finalMessageSettings?.mediaSlots.length
            ? card.finalMessageSettings.mediaSlots
            : getMessageMediaSlots(messageMediaLayout))
        : []
    ).slice(0, messageMediaLayout === "portrait" ? 1 : messageMediaLayout === "landscape-pair" ? 2 : 3),
    memoryMediaAssets: resolveAssignedMediaAssets(
      normalizedMediaAssets,
      card.finalMemorySettings?.mediaAssetIds ?? [],
      card.deliveryStatus === "DELIVERED"
        ? (card.finalMemorySettings?.mediaSlots.length
            ? card.finalMemorySettings.mediaSlots
            : getMemoryMediaSlots())
        : []
    ).slice(0, card.finalMemorySettings?.photoCount ?? 3),
    memoryTitle: normalizeMemoryTitle(card.finalMemorySettings?.title),
    memoryDescription: normalizeMemoryDescription(card.finalMemorySettings?.description),
    memoryPhotoCount: card.finalMemorySettings?.photoCount ?? 3,
    messageLayoutMode,
    messageMediaLayout,
    showAllMessagesLink: visibleMessageContributions.length > layoutProfile.cardsPerPage,
    footerSignature:
      !card.signature || card.signature === `С любовью, ${card.fromLabel}` ? "От тех, кто тебя ценит" : card.signature,
    blocks: buildFinalCardLayout(
      style,
      availability,
      card.finalBlockSettings,
      card.finalBlockOrder,
      options.includeIncompleteBlocks ?? false
    ).blocks
  };
};
