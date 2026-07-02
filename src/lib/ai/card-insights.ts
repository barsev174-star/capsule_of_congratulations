import { createHash } from "node:crypto";
import type { Contribution } from "@/lib/cards/types";
import type { AiCardInsightItem } from "@/lib/ai/types";
import { textSimilarity } from "@/lib/ai/response-validation";
import { containsTechnicalText, countCharacters } from "@/lib/ai/validation";

export const buildContributionFingerprint = (contributions: Contribution[]) =>
  createHash("sha256")
    .update(
      contributions
        .map((item) => `${item.id}:${item.updatedAt}:${item.message.replace(/\s+/g, " ").trim()}`)
        .join("\n")
    )
    .digest("hex");

export const validateBestQuoteCandidates = (
  value: unknown,
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] | null => {
  const rawItems = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { quotes?: unknown }).quotes)
      ? (value as { quotes: unknown[] }).quotes
      : null;

  if (!rawItems || rawItems.length !== 3) return null;
  const sourceById = new Map(contributions.map((item) => [item.id, item.message]));
  const items: AiCardInsightItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== "object") return null;
    const raw = item as Record<string, unknown>;
    const text = typeof raw.text === "string" ? raw.text.replace(/\s+/g, " ").trim() : "";
    const sourceContributionId = typeof raw.sourceContributionId === "string" ? raw.sourceContributionId : "";
    const source = sourceById.get(sourceContributionId);

    if (
      !source ||
      countCharacters(text) < 18 ||
      countCharacters(text) > 120 ||
      containsTechnicalText(text) ||
      /поздравл|с\s+дн[её]м\s+рожд/iu.test(text)
    ) {
      return null;
    }
    if (textSimilarity(text, source) < 0.16) return null;
    if (items.some((existing) => textSimilarity(existing.text, text) >= 0.82)) return null;

    items.push({ text, sourceContributionId });
  }

  return items;
};

export const buildMockBestQuotes = (
  contributions: Pick<Contribution, "id" | "message">[]
): AiCardInsightItem[] => {
  const items: AiCardInsightItem[] = [];

  const candidates = contributions.flatMap((contribution) => contribution.message
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 18)
    .filter((sentence) => !/поздравл|с\s+дн[её]м\s+рожд|^(?:пусть|жела)/iu.test(sentence))
    .map((sentence) => ({
      sourceContributionId: contribution.id,
      text: sentence
        .replace(/^[А-ЯЁ][А-ЯЁа-яё-]+(?:\s+[А-ЯЁ][А-ЯЁа-яё-]+){0,2},\s*/u, "")
        .trim(),
      score: (/спасибо|благодаря|ценим|важн|дет|помог|забот|тянутся|рассказывает/iu.test(sentence) ? 20 : 0)
        + Math.min(sentence.length, 120)
    })))
    .filter((candidate) => candidate.text.length >= 18)
    .sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    const text = candidate.text.length <= 120
      ? candidate.text
      : `${candidate.text.slice(0, 119).replace(/\s+\S*$/, "").replace(/[,:;\s]+$/, "")}…`;
    if (items.some((item) => textSimilarity(item.text, text) >= 0.82)) continue;
    items.push({ text, sourceContributionId: candidate.sourceContributionId });
    if (items.length === 3) break;
  }

  return items;
};

const qualityKeywords: Array<{ text: string; stems: string[] }> = [
  { text: "доброта", stems: ["добр", "доброт"] },
  { text: "забота", stems: ["забот"] },
  { text: "надёжность", stems: ["надеж", "надёж"] },
  { text: "вдохновение", stems: ["вдохнов"] },
  { text: "поддержка", stems: ["поддерж"] },
  { text: "тепло", stems: ["тепл", "тёпл"] },
  { text: "чувство юмора", stems: ["юмор", "весел", "весёл"] },
  { text: "искренность", stems: ["искрен"] },
  { text: "энергия", stems: ["энерг"] },
  { text: "мудрость", stems: ["мудр"] },
  { text: "внимание", stems: ["вниматель", "внимание"] },
  { text: "спокойствие", stems: ["спокой"] },
  { text: "радость", stems: ["радост"] }
];

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
