import { createHash } from "node:crypto";
import type { Contribution } from "@/lib/cards/types";
import type { AiCardInsightItem } from "@/lib/ai/types";
import { textSimilarity } from "@/lib/ai/response-validation";
import { containsTechnicalText, countCharacters } from "@/lib/ai/validation";

export const BEST_QUOTE_COUNT = 3;
export const BEST_QUOTE_CANDIDATE_COUNT = 6;
export const BEST_QUOTE_MIN_CONTRIBUTION_COUNT = 6;
export const BEST_QUOTE_TARGET_MIN_LENGTH = 55;
export const BEST_QUOTE_TARGET_MAX_LENGTH = 80;
export const BEST_QUOTE_HARD_MAX_LENGTH = 100;

export const buildContributionFingerprint = (contributions: Contribution[]) =>
  createHash("sha256")
    .update(
      contributions
        .map((item) => `${item.id}:${item.updatedAt}:${item.message.replace(/\s+/g, " ").trim()}`)
        .join("\n")
    )
    .digest("hex");

export const normalizeBestQuote = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^["«„“]+|["»“”]+$/g, "")
    .trim();

export const isValidBestQuoteText = (value: string) => {
  const text = normalizeBestQuote(value);
  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length;

  return (
    countCharacters(text) >= 18 &&
    countCharacters(text) <= BEST_QUOTE_HARD_MAX_LENGTH &&
    !text.includes("...") &&
    !text.includes("…") &&
    sentenceCount <= 2
  );
};

export const validateBestQuoteCandidates = (
  value: unknown,
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] | null => {
  const rawItems = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { quotes?: unknown }).quotes)
      ? (value as { quotes: unknown[] }).quotes
      : null;

  if (!rawItems || rawItems.length < BEST_QUOTE_COUNT) return null;
  const sourceById = new Map(contributions.map((item) => [item.id, item.message]));
  const items: AiCardInsightItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const text = typeof raw.text === "string" ? normalizeBestQuote(raw.text) : "";
    const sourceContributionId = typeof raw.sourceContributionId === "string" ? raw.sourceContributionId : "";
    const source = sourceById.get(sourceContributionId);

    if (
      !source ||
      !isValidBestQuoteText(text) ||
      containsTechnicalText(text) ||
      /поздравл|с\s+дн[её]м\s+рожд/iu.test(text)
    ) {
      continue;
    }
    if (textSimilarity(text, source) < 0.16) continue;
    if (items.some((existing) => textSimilarity(existing.text, text) >= 0.82)) continue;

    items.push({ text, sourceContributionId });
    if (items.length === BEST_QUOTE_COUNT) return items;
  }

  return null;
};

export const buildMockBestQuotes = (
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] => {
  const items: AiCardInsightItem[] = [];

  const candidates = contributions.flatMap((contribution) => contribution.message
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => isValidBestQuoteText(sentence))
    .filter((sentence) => !/поздравл|с\s+дн[её]м\s+рожд|^(?:пусть|жела)/iu.test(sentence))
    .map((sentence) => ({
      sourceContributionId: contribution.id,
      text: sentence
        .replace(/^[А-ЯЁ][А-ЯЁа-яё-]+(?:\s+[А-ЯЁ][А-ЯЁа-яё-]+){0,2},\s*/u, "")
        .trim(),
      score: (/спасибо|благодаря|ценим|важн|дет|помог|забот|тянутся|рассказывает/iu.test(sentence) ? 20 : 0)
        + Math.min(sentence.length, BEST_QUOTE_HARD_MAX_LENGTH)
    })))
    .filter((candidate) => isValidBestQuoteText(candidate.text))
    .sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    const text = candidate.text;
    if (items.some((item) => textSimilarity(item.text, text) >= 0.82)) continue;
    items.push({ text, sourceContributionId: candidate.sourceContributionId });
    if (items.length === BEST_QUOTE_COUNT) break;
  }

  return items;
};

const qualityKeywords: Array<{ text: string; stems: string[] }> = [
  { text: "доброта", stems: ["добр", "доброт"] },
  { text: "забота", stems: ["забот"] },
  { text: "отзывчивость", stems: ["помог", "выручил", "выруч", "подсоб", "машин"] },
  { text: "неравнодушие", stems: ["лифт", "площадк", "подъезд", "мусор", "сосед"] },
  { text: "ответственность", stems: ["ответствен", "убира", "порядок", "дело"] },
  { text: "аккуратность", stems: ["аккурат", "не мусор", "чист"] },
  { text: "вежливость", stems: ["здорова", "уваж"] },
  { text: "надёжность", stems: ["надеж", "надёж"] },
  { text: "вдохновение", stems: ["вдохнов"] },
  { text: "поддержка", stems: ["поддерж"] },
  { text: "тепло", stems: ["тепл", "тёпл"] },
  { text: "чувство юмора", stems: ["юмор", "весел", "весёл"] },
  { text: "искренность", stems: ["искрен"] },
  { text: "энергия", stems: ["энерг"] },
  { text: "мудрость", stems: ["мудр"] },
  { text: "внимательность", stems: ["вниматель", "внимание"] }
];

const forbiddenQualityPatterns = [
  /(?:^|[^а-яё])(?:здоровья|здоровье|долголетия|долголетие|денег|деньги|спокойствия|сил|самочувствия|удачи|счастья)(?:$|[^а-яё])/iu,
  /(?:^|[^а-яё])(?:радостных\s+дней|хороших\s+людей|побольше\s+сил)(?:$|[^а-яё])/iu,
  /(?:^|[^а-яё])(?:помог|помогает|помогла|помогал|починил|починила|починит|убирает|убираешь|убрал|мусорит|здоровается|здороваешься|подводит)(?:$|[^а-яё])/iu,
  /(?:^|[^а-яё])(?:машиной|машина|лифт|площадку|площадка|подъезд|доставка)(?:$|[^а-яё])/iu
];

const looksLikeStableQuality = (text: string) =>
  !forbiddenQualityPatterns.some((pattern) => pattern.test(text));

export const validateQualityCandidates = (
  value: unknown,
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] | null => {
  const rawItems = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { qualities?: unknown }).qualities)
      ? (value as { qualities: unknown[] }).qualities
      : null;

  if (!rawItems || rawItems.length !== 5) return null;
  const sourceIds = new Set(contributions.map((item) => item.id));
  const seen = new Set<string>();
  const items: AiCardInsightItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const text = typeof raw.text === "string" ? raw.text.replace(/\s+/g, " ").trim().toLowerCase() : "";
    const sourceContributionId = typeof raw.sourceContributionId === "string" ? raw.sourceContributionId : "";
    const wordCount = text.split(" ").filter(Boolean).length;

    if (
      !sourceIds.has(sourceContributionId) ||
      countCharacters(text) < 2 ||
      countCharacters(text) > 28 ||
      wordCount > 3 ||
      !/^[а-яё -]+$/iu.test(text) ||
      containsTechnicalText(text) ||
      !looksLikeStableQuality(text) ||
      seen.has(text)
    ) {
      return null;
    }

    seen.add(text);
    items.push({ text, sourceContributionId });
  }

  return items;
};

export const buildMockQualities = (
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] => {
  const items: AiCardInsightItem[] = [];

  for (const { text, stems } of qualityKeywords) {
    const source = contributions.find((contribution) => {
      const message = contribution.message.toLowerCase();
      return stems.some((stem) => message.includes(stem));
    });
    if (!source) continue;
    items.push({ text, sourceContributionId: source.id });
    if (items.length === 5) break;
  }

  const fallbackSourceId = contributions[0]?.id;
  if (fallbackSourceId) {
    for (const text of ["доброта", "забота", "тепло", "поддержка", "искренность"]) {
      if (items.some((item) => item.text === text)) continue;
      items.push({ text, sourceContributionId: fallbackSourceId });
      if (items.length === 5) break;
    }
  }

  return items;
};
