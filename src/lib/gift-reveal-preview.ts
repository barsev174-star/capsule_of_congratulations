import type { CardDraft, Contribution } from "@/lib/cards/types";
import { resolveMainGreetingContribution } from "@/lib/final-card/main-greeting";

export type GiftRevealMessagePreview = {
  id: string;
  authorName: string;
  excerpt: string;
  isMain: boolean;
};

const normalizeWords = (value: string) => value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

/**
 * Keeps the preview readable while guaranteeing that a real message is never
 * reproduced in full. Words are always kept intact and the excerpt always ends
 * with an ellipsis.
 */
export const toGiftRevealExcerpt = (value: string, maximumWords = 6) => {
  const words = normalizeWords(value);
  if (words.length === 0) return "Тёплые слова уже внутри…";

  const visibleCount = words.length <= maximumWords
    ? Math.max(1, words.length - 1)
    : maximumWords;
  return `${words.slice(0, visibleCount).join(" ")}…`;
};

export const selectGiftRevealMessages = (
  card: Pick<CardDraft, "deliveryStatus" | "finalMainGreetingSettings">,
  contributions: readonly Contribution[]
): GiftRevealMessagePreview[] => {
  const ordered = [...contributions];
  const mainGreeting = resolveMainGreetingContribution(card, ordered);
  const selected = mainGreeting
    ? [mainGreeting, ...ordered.filter((item) => item.id !== mainGreeting.id)].slice(0, 6)
    : ordered.slice(0, 6);

  return selected.map((contribution) => ({
    id: contribution.id,
    authorName: contribution.authorName.trim() || "Участник",
    excerpt: toGiftRevealExcerpt(contribution.message),
    isMain: contribution.id === mainGreeting?.id
  }));
};
