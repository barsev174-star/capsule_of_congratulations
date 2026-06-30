import { isTemplateId } from "@/lib/cards/templates";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import { buildFinalCardLayout } from "@/lib/final-card/planner";
import type {
  FinalCardContentAvailability,
  FinalCardAiContent,
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
  mainGreetingContributionId: string | null;
  mainGreetingAuthorName: string | null;
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

const resolveMainGreeting = (card: CardDraft, contributions: Contribution[]) => {
  const selectedContributionId = card.finalMainGreetingSettings?.contributionId;
  const selectedContribution = selectedContributionId
    ? contributions.find((contribution) => contribution.id === selectedContributionId)
    : null;

  return selectedContribution ?? contributions[0] ?? null;
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

const resolveStyle = (templateId: CardDraft["templateId"]): FinalCardStyleId =>
  isTemplateId(templateId) ? templateId : "warm-classic";

const resolveOrderedMediaAssets = (
  mediaAssets: CardMediaAsset[],
  assetIds: string[],
  slots: string[],
  fallbackSlots: string[]
) => {
  const selected: CardMediaAsset[] = [];
  const selectedIds = new Set<string>();
  const selectedSlots = [...slots, ...fallbackSlots.filter((slot) => !slots.includes(slot))].slice(0, fallbackSlots.length);
  const addAsset = (asset: CardMediaAsset | undefined) => {
    if (!asset || selectedIds.has(asset.id)) {
      return;
    }

    selected.push(asset);
    selectedIds.add(asset.id);
  };

  selectedSlots.forEach((slot) => addAsset(mediaAssets.find((asset) => asset.slot === slot)));
  assetIds.forEach((id) => addAsset(mediaAssets.find((asset) => asset.id === id)));

  return selected.slice(0, selectedSlots.length);
};

export const buildFinalCardViewModel = (
  card: CardDraft,
  contributions: Contribution[],
  mediaAssets: CardMediaAsset[] = [],
  aiContent: FinalCardAiContent = {}
): FinalCardViewModel => {
  const normalizedMediaAssets = mediaAssets.map((asset) => ({
    ...asset,
    captionSubtitle: asset.captionTitle || asset.captionSubtitle
  }));
  const style = resolveStyle(card.templateId);
  const messageLayoutMode = card.finalMessageSettings?.layoutMode ?? "grid-2";
  const messageMediaLayout = card.finalMessageSettings?.mediaLayout ?? "portrait";
  const layoutProfile = getFinalCardMessageLayoutProfile(messageLayoutMode);
  const qualities = aiContent.qualities?.length ? aiContent.qualities.slice(0, 5) : extractQualities(contributions);
  const quotes = aiContent.quotes?.length ? aiContent.quotes.slice(0, 3) : extractQuotes(contributions);
  const memories = buildMemories(contributions);
  const mainGreeting = resolveMainGreeting(card, contributions);
  const visibleMessageContributions = mainGreeting
    ? contributions.filter((contribution) => contribution.id !== mainGreeting.id)
    : contributions;
  const availability: FinalCardContentAvailability = {
    hasSummary: true,
    hasQualities: qualities.length > 0,
    hasMemories: true,
    hasQuotes: quotes.length > 0,
    hasAiSummary: false
  };

  return {
    style,
    recipientName: card.recipientName,
    occasionLabel: card.occasionText,
    fromLabel: card.fromLabel,
    participantCount: contributions.length,
    finalSlug: card.finalSlug,
    summaryTitle: "Самые важные слова",
    summaryText: mainGreeting ? trimMainGreetingText(mainGreeting.message) : buildSummaryText(card, contributions),
    mainGreetingContributionId: mainGreeting?.id ?? null,
    mainGreetingAuthorName: mainGreeting?.authorName ?? null,
    aiSummaryTitle: "Общее поздравление",
    aiSummaryText: buildAiSummaryText(card, contributions),
    qualities,
    quotes,
    contributions: visibleMessageContributions,
    memories,
    mediaAssets: normalizedMediaAssets,
    messageMediaAssets: resolveOrderedMediaAssets(
      normalizedMediaAssets,
      card.finalMessageSettings?.mediaAssetIds ?? [],
      card.finalMessageSettings?.mediaSlots ?? [],
      messageMediaLayout === "portrait"
        ? ["portrait"]
        : messageMediaLayout === "landscape-pair"
          ? ["landscape-a", "landscape-b"]
          : ["landscape-a", "landscape-b", "landscape-c"]
    ),
    memoryMediaAssets: resolveOrderedMediaAssets(
      normalizedMediaAssets,
      card.finalMemorySettings?.mediaAssetIds ?? [],
      card.finalMemorySettings?.mediaSlots ?? [],
      ["memory-a", "memory-b", "memory-c"]
    ).slice(0, card.finalMemorySettings?.photoCount ?? 3),
    memoryTitle: normalizeMemoryTitle(card.finalMemorySettings?.title),
    memoryDescription: normalizeMemoryDescription(card.finalMemorySettings?.description),
    memoryPhotoCount: card.finalMemorySettings?.photoCount ?? 3,
    messageLayoutMode,
    messageMediaLayout,
    showAllMessagesLink: visibleMessageContributions.length > layoutProfile.cardsPerPage,
    footerSignature:
      !card.signature || card.signature === `С любовью, ${card.fromLabel}` ? "От тех, кто тебя ценит" : card.signature,
    blocks: buildFinalCardLayout(style, availability, card.finalBlockSettings, card.finalBlockOrder).blocks
  };
};
