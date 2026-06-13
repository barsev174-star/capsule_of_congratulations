import { randomUUID } from "node:crypto";
import { countAiGenerationsByCardId, saveAiGenerationLog } from "@/lib/ai/repository";
import type { AiGenerationInput, AiGenerationLog, AiGenerationResult, AiStyle } from "@/lib/ai/types";
import { logger } from "@/lib/logger";

const CARD_GENERATION_LIMIT = 50;

const negativePatterns = [/крич/i, /ор[её]/i, /руг/i, /зл/i, /бесит/i, /ненав/i, /туп/i];

const cleanText = (value: string) =>
  value
    .replace(/[!]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeSentence = (value?: string) => {
  const cleaned = cleanText(value ?? "");
  if (!cleaned) {
    return "";
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const hashText = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const pickBySeed = <T,>(items: T[], seed: number, offset = 0) => items[(seed + offset) % items.length];

const splitDraftNotes = (draftNotes: string) =>
  cleanText(draftNotes)
    .split(/[.;\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3)
    .filter((item) => !negativePatterns.some((pattern) => pattern.test(item)))
    .slice(0, 5);

const normalizeClause = (text: string) => {
  const cleaned = cleanText(text);
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
};

const extractWishClauses = (parts: string[]) =>
  parts.filter((part) => /жела|пожела|пусть|оставай|будь|любви|радост|здоров|успех|счаст/i.test(part));

const extractValueClauses = (parts: string[]) =>
  parts.filter((part) => /ценю|благодар|нрав|рад|важно|вдохнов|скром|целеустрем|доброт|тепл|забот/i.test(part));

const extractGeneralClauses = (parts: string[], wishClauses: string[], valueClauses: string[]) =>
  parts.filter((part) => !wishClauses.includes(part) && !valueClauses.includes(part));

const normalizeWishClause = (clause: string) => {
  const cleaned = normalizeClause(clause)
    .replace(/^(хочу\s+)?пожелать\s+/i, "")
    .replace(/^желаю\s+/i, "")
    .replace(/^пусть\s+/i, "")
    .trim();

  if (/^будь\s+/i.test(cleaned)) {
    return cleaned.replace(/^будь\s+/i, "оставаться ");
  }

  if (/^оставайся\s+/i.test(cleaned)) {
    return cleaned.replace(/^оставайся\s+/i, "оставаться ");
  }

  return cleaned;
};

const buildOpening = (recipientName: string, occasionText: string, seed: number) => {
  const context = cleanText(occasionText).toLowerCase();

  if (context.includes("команд") || context.includes("коллег")) {
    return pickBySeed(
      [
        `${recipientName}, с вами особенно приятно проходить важные рабочие и человеческие моменты вместе.`,
        `${recipientName}, рядом с вами особенно ценятся надежность, тепло и умение поддержать других.`
      ],
      seed
    );
  }

  if (context.includes("учител") || context.includes("воспит")) {
    return pickBySeed(
      [
        `${recipientName}, сегодня особенно хочется сказать вам теплые слова благодарности и уважения.`,
        `${recipientName}, очень хочется поблагодарить вас за то добро и участие, которые вы даете людям рядом.`
      ],
      seed
    );
  }

  return pickBySeed(
    [
      `${recipientName}, сегодня особенно хочется сказать вам несколько по-настоящему теплых слов.`,
      `${recipientName}, в этот день особенно хочется собрать для вас добрые и искренние пожелания.`
    ],
    seed
  );
};

const buildValueSentence = (valueClauses: string[], seed: number) => {
  if (valueClauses.length === 0) {
    return "";
  }

  const clause = normalizeClause(valueClauses[0]);

  return pickBySeed(
    [
      `Очень ценю, что ${clause}.`,
      `Особенно хочется отметить, что ${clause}.`,
      `Именно это в вас особенно ценно: ${clause}.`
    ],
    seed,
    1
  );
};

const buildWishSentence = (wishClauses: string[], seed: number) => {
  if (wishClauses.length === 0) {
    return "";
  }

  const clause = normalizeWishClause(wishClauses[0]);

  if (!clause) {
    return "";
  }

  return pickBySeed(
    [
      `Желаю вам ${clause}.`,
      `От души хочу пожелать вам ${clause}.`,
      `Пусть в вашей жизни будет больше ${clause}.`
    ],
    seed,
    2
  );
};

const buildGeneralSentence = (generalClauses: string[], seed: number) => {
  if (generalClauses.length === 0) {
    return "";
  }

  const clause = normalizeClause(generalClauses[0]);

  return pickBySeed(
    [
      `Рядом с вами чувствуется, что ${clause}.`,
      `Это очень откликается: ${clause}.`,
      `И в этом особенно чувствуется ваша человеческая сила: ${clause}.`
    ],
    seed,
    3
  );
};

const buildContextTail = (occasionText: string) => {
  const cleaned = cleanText(occasionText);
  const lower = cleaned.toLowerCase();

  if (!cleaned) {
    return "";
  }

  if (lower.startsWith("за ")) {
    return `Эти слова мы собираем в честь ${lower.slice(3)}.`;
  }

  if (lower.startsWith("на ") || lower.startsWith("к ")) {
    return `Эти слова мы собираем ${lower}.`;
  }

  return `Эти слова мы собираем по поводу ${lower}.`;
};

const styleClosers: Record<AiStyle, string> = {
  "warm-simple": "Спасибо вам за то тепло, которое вы дарите людям рядом.",
  "short-no-pathos": "Пусть впереди будет больше спокойных и радостных дней.",
  humor: "И пусть хорошее настроение у вас всегда приходит чуть раньше повседневных забот.",
  touching: "Очень хочется, чтобы вы чувствовали, как много доброго о вас думают.",
  respectful: "Пусть ваше внимание к людям возвращается к вам благодарностью и уважением."
};

const buildShortVariant = (
  recipientName: string,
  wishClauses: string[],
  valueClauses: string[],
  generalClauses: string[],
  seed: number
) => {
  const parts = [
    buildWishSentence(wishClauses, seed),
    buildValueSentence(valueClauses, seed),
    buildGeneralSentence(generalClauses, seed)
  ].filter(Boolean);

  const text = parts.slice(0, 2).join(" ");

  if (!text) {
    return `${recipientName}, пусть впереди будет больше радости, тепла и хороших дней.`;
  }

  return `${recipientName}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
};

const buildStyledVariant = (
  opening: string,
  wishSentence: string,
  valueSentence: string,
  generalSentence: string,
  contextTail: string,
  style: AiStyle
) =>
  [opening, valueSentence, generalSentence, wishSentence, contextTail, styleClosers[style]]
    .filter(Boolean)
    .join(" ");

const buildVariants = (input: AiGenerationInput, generationIndex: number) => {
  const cleanedRecipientName = sanitizeSentence(input.recipientName);
  const cleanedNotes = splitDraftNotes(input.draftNotes);
  const wishClauses = extractWishClauses(cleanedNotes);
  const valueClauses = extractValueClauses(cleanedNotes);
  const generalClauses = extractGeneralClauses(cleanedNotes, wishClauses, valueClauses);

  const seed = hashText(
    [
      input.cardId,
      input.recipientName,
      input.occasion,
      input.occasionText,
      input.draftNotes,
      input.style,
      String(generationIndex)
    ].join("::")
  );

  const opening = buildOpening(cleanedRecipientName, input.occasionText, seed);
  const valueSentence = buildValueSentence(valueClauses, seed);
  const wishSentence = buildWishSentence(wishClauses, seed);
  const generalSentence = buildGeneralSentence(generalClauses, seed);
  const contextTail = buildContextTail(input.occasionText);

  const short = buildShortVariant(cleanedRecipientName, wishClauses, valueClauses, generalClauses, seed);
  const heartfelt = [opening, wishSentence, valueSentence, generalSentence, styleClosers[input.style]]
    .filter(Boolean)
    .join(" ");
  const styled = buildStyledVariant(opening, wishSentence, valueSentence, generalSentence, contextTail, input.style);

  return [
    { id: "short", label: "Короткий вариант", text: short },
    { id: "heartfelt", label: "Душевный вариант", text: heartfelt },
    { id: "styled", label: "В выбранном стиле", text: styled }
  ];
};

export const generateParticipantMessage = async (input: AiGenerationInput): Promise<AiGenerationResult> => {
  const usedCount = await countAiGenerationsByCardId(input.cardId);

  if (usedCount >= CARD_GENERATION_LIMIT) {
    throw new Error("CARD_AI_LIMIT_REACHED");
  }

  const variants = buildVariants(input, usedCount);
  const remainingCardGenerations = CARD_GENERATION_LIMIT - usedCount - 1;

  const logEntry: AiGenerationLog = {
    id: randomUUID(),
    cardId: input.cardId,
    generationType: "participant_message",
    inputJson: JSON.stringify(input),
    outputText: JSON.stringify(variants),
    model: "local-template-v5",
    createdAt: new Date().toISOString()
  };

  await saveAiGenerationLog(logEntry);

  logger.info("ai.participant_generated", "Participant AI draft generated", {
    cardId: input.cardId,
    occasion: input.occasion,
    remainingCardGenerations
  });

  return {
    variants,
    remainingCardGenerations
  };
};
