import { randomUUID } from "node:crypto";
import {
  completeAiUsageEvent,
  completeAiGeneration,
  getAiUsageSummary,
  releaseAiGeneration,
  reserveAiGeneration,
  saveAiCardInsight
} from "@/lib/ai/repository";
import { generateBestQuotesWithGigaChat, generateQualitiesWithGigaChat, generateWithGigaChat } from "@/lib/ai/gigachat-provider";
import {
  generateMatrixWithOpenAi,
  generateWithOpenAi,
  OPENAI_GREETING_PROMPT_VERSION,
  OPENAI_MATRIX_PROMPT_VERSION
} from "@/lib/ai/openai-provider";
import { selectMatrixVariants } from "@/lib/ai/greeting-matrix";
import {
  buildContributionFingerprint,
  buildMockBestQuotes,
  buildMockQualities,
  validateBestQuoteCandidates,
  validateQualityCandidates
} from "@/lib/ai/card-insights";
import { findSharedTemplatePhrase, inspectProviderVariants, textSimilarity } from "@/lib/ai/response-validation";
import type { ProviderVariantValidationIssue } from "@/lib/ai/response-validation";
import { AiError } from "@/lib/ai/types";
import type {
  AiGenerationInput,
  AiGenerationResult,
  AiBestQuotesResult,
  AiQualitiesResult,
  AiProviderName,
  AiProviderResult,
  AiStyle,
  AiVariant
} from "@/lib/ai/types";
import { logger } from "@/lib/logger";

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

const fitTextToLimit = (text: string, messageLimit: number) => {
  if (text.length <= messageLimit) {
    return text;
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    let current = sentences.join(" ");

    while (current.length > messageLimit && sentences.length > 1) {
      sentences.pop();
      current = sentences.join(" ");
    }

    if (current.length <= messageLimit) {
      return current;
    }
  }

  return `${text.slice(0, Math.max(0, messageLimit - 1)).trimEnd()}…`;
};

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

const buildVariants = (input: AiGenerationInput, generationIndex: number): AiVariant[] => {
  const messageLimit = Number.isFinite(input.messageLimit) ? input.messageLimit : 240;
  const cleanedRecipientName = sanitizeSentence(input.recipientName);
  const cleanedNotes = splitDraftNotes(input.draftNotes);
  const wishClauses = extractWishClauses(cleanedNotes);
  const valueClauses = extractValueClauses(cleanedNotes);
  const generalClauses = extractGeneralClauses(cleanedNotes, wishClauses, valueClauses);

  const seed = hashText(
    [
      input.cardId,
      input.recipientName,
      input.occasionText,
      input.draftNotes,
      input.style,
      String(generationIndex)
    ].join("::")
  ) + generationIndex * 7;

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
    { id: "short" as const, label: "Короткий вариант", text: short },
    { id: "warm" as const, label: "Душевный", text: heartfelt },
    { id: "style" as const, label: "Ваш стиль", text: styled }
  ].map((variant) => ({
    ...variant,
    text: fitTextToLimit(variant.text, messageLimit)
  }));
};

const shortenAtWordBoundary = (value: string, limit: number) => {
  const normalized = cleanText(value);
  if (normalized.length <= limit) return normalized;

  const slice = normalized.slice(0, Math.max(1, limit - 1));
  const boundary = slice.lastIndexOf(" ");
  const shortened = slice.slice(0, boundary > 40 ? boundary : slice.length).replace(/[,:;\s]+$/, "");
  return `${shortened}…`;
};

const buildShortenedVariants = (input: AiGenerationInput): AiVariant[] => {
  const targets = [
    input.messageLimit,
    Math.max(60, input.messageLimit - 24),
    Math.max(48, Math.floor(input.messageLimit * 0.72))
  ];

  return [
    { id: "short" as const, label: "Бережно", text: shortenAtWordBoundary(input.draftNotes, targets[0]) },
    { id: "warm" as const, label: "Короче", text: shortenAtWordBoundary(input.draftNotes, targets[1]) },
    { id: "style" as const, label: "Самое короткое", text: shortenAtWordBoundary(input.draftNotes, targets[2]) }
  ];
};

const getProviderName = (value?: string): AiProviderName =>
  value === "gigachat" || value === "openai" ? value : "mock";

const getInsightsProviderName = (): AiProviderName =>
  (process.env.AI_INSIGHTS_PROVIDER ?? (process.env.GIGACHAT_AUTH_KEY ? "gigachat" : "mock")) === "gigachat"
    ? "gigachat"
    : "mock";

export const generateParticipantMessage = async (input: AiGenerationInput): Promise<AiGenerationResult> => {
  const providerName = getProviderName(process.env.AI_GREETING_PROVIDER ?? process.env.AI_PROVIDER);
  const matrixRequested = process.env.AI_GREETING_MODE === "matrix";
  const greetingMode = matrixRequested && providerName === "openai" && (input.mode ?? "compose") === "compose"
    ? "matrix"
    : "classic";
  if (process.env.NODE_ENV !== "production" && matrixRequested && greetingMode === "classic") {
    logger.warn("ai.matrix_classic_fallback", "Matrix mode requires OpenAI compose generation; using classic", {
      provider: providerName,
      mode: input.mode ?? "compose"
    });
  }
  const usageSummary = await getAiUsageSummary(input.cardId);
  const generationId = randomUUID();
  const reservation = await reserveAiGeneration({ id: generationId, cardId: input.cardId, limit: usageSummary.limit });

  if (!reservation) {
    throw new AiError("LIMIT_REACHED", "AI generation limit reached for this card.");
  }

  const existingMessages = input.existingMessages ?? [];
  let providerResult: AiProviderResult | null = null;
  let variants: AiVariant[] | null = null;
  const acceptedVariants = new Map<AiVariant["id"], AiVariant>();
  let validationFeedback: string[] = [];
  let lastProviderError: AiError | null = null;
  let lastValidationIssues: ProviderVariantValidationIssue[] = [];
  let matrixUsage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;
  let matrixGeneratedCount = 0;

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const providerInput = {
              ...input,
              existingMessages,
              fromLabel: input.fromLabel ?? "",
              attempt,
              validationFeedback,
              requestedVariantTypes: (["short", "warm", "style"] as const)
                .filter((type) => !acceptedVariants.has(type))
            };
        if (greetingMode === "matrix") {
          const matrixResult = await generateMatrixWithOpenAi(providerInput);
          matrixGeneratedCount = matrixResult.variants.length;
          matrixUsage = matrixResult.usage;
          providerResult = {
            variants: selectMatrixVariants(matrixResult.variants, input.style),
            model: matrixResult.model
          };
        } else {
          providerResult = providerName === "gigachat"
            ? await generateWithGigaChat(providerInput)
            : providerName === "openai"
              ? await generateWithOpenAi(providerInput)
              : {
              variants: input.mode === "shorten"
                ? buildShortenedVariants(input)
                : buildVariants(input, reservation.usage.used - 1 + attempt),
              model: "local-template-v5"
            };
        }
      } catch (error) {
        if (
          error instanceof AiError &&
          (
            error.code === "PROVIDER_UNAVAILABLE" ||
            error.code === "INVALID_PROVIDER_RESPONSE" ||
            error.code === "INVALID_JSON"
          )
        ) {
          lastProviderError = error;
          if (error.code === "INVALID_JSON") {
            validationFeedback = ["верни синтаксически валидный JSON указанной структуры"];
          }
          logger.warn("ai.participant_provider_retry", "Greeting provider response requires another attempt", {
            cardId: input.cardId,
            provider: providerName,
            attempt: attempt + 1,
            errorCode: error.code
          });
          if (attempt === 0) continue;
          break;
        }
        throw error;
      }

      const validation = inspectProviderVariants({
        value: providerResult.variants,
        maxLength: input.messageLimit,
        draftNotes: input.draftNotes,
        existingMessages,
        mode: input.mode ?? "compose",
        style: input.style,
        recipientName: input.recipientName,
        relationshipContext: input.relationshipContext,
        enforcePromptRules: providerName !== "mock"
      });

      lastValidationIssues = validation.issues;
      validationFeedback = validation.issues.map((issue) => issue.message);

      if (process.env.NODE_ENV !== "production") {
        logger.info("ai.participant_validation_result", "AI greeting validation completed", {
          provider: providerName,
          model: providerResult.model,
          greetingMode,
          mode: input.mode ?? "compose",
          style: input.style,
          promptVersion: providerName === "openai"
            ? greetingMode === "matrix" ? OPENAI_MATRIX_PROMPT_VERSION : OPENAI_GREETING_PROMPT_VERSION
            : undefined,
          attempt: attempt + 1,
          acceptedTypes: validation.variants.map((variant) => variant.id),
          issueCodes: validation.issues.map((issue) => issue.code)
        });
      }

      if (process.env.NODE_ENV !== "production" && validation.issues.length > 0) {
        logger.warn("ai.participant_validation_failed", "AI greeting variants failed validation", {
          cardId: input.cardId,
          attempt: attempt + 1,
          parsedVariants: providerResult.variants,
          reasons: validation.issues.map((issue) => ({
            type: issue.type,
            code: issue.code,
            severity: issue.severity,
            message: issue.message
          }))
        });
      }
      for (const candidate of validation.variants) {
        const duplicatesAcceptedType = [...acceptedVariants.values()].some(
          (accepted) => accepted.id !== candidate.id && textSimilarity(accepted.text, candidate.text) === 1
        );
        if (duplicatesAcceptedType) {
          validationFeedback.push(`${candidate.id}: сделай текст отличающимся от уже принятого варианта`);
          continue;
        }
        const repeatedPhrase = providerName === "mock"
          ? null
          : [...acceptedVariants.values()]
              .map((accepted) => findSharedTemplatePhrase(candidate.text, accepted.text))
              .find(Boolean);
        if (repeatedPhrase) {
          validationFeedback.push(`${candidate.id}: не повторяй формулировку «${repeatedPhrase}» из уже принятого варианта`);
          continue;
        }
        if (!acceptedVariants.has(candidate.id)) acceptedVariants.set(candidate.id, candidate);
      }

      if (acceptedVariants.size === 3) {
        variants = (["short", "warm", "style"] as const).map((type) => acceptedVariants.get(type)!);
        break;
      }

      logger.warn("ai.participant_validation_retry", "Greeting variants require another attempt", {
        cardId: input.cardId,
        provider: providerName,
        attempt: attempt + 1,
        acceptedTypes: [...acceptedVariants.keys()],
        issueCodes: validation.issues.map((issue) => issue.code)
      });
    }

    if (!variants) {
      if (lastProviderError) throw lastProviderError;
      if (lastValidationIssues.length > 0) {
        throw new AiError(
          "AI_VALIDATION_FAILED",
          `Greeting quality validation failed: ${[...new Set(lastValidationIssues.map((issue) => issue.code))].join(", ")}`
        );
      }
      throw new AiError("AI_VALIDATION_FAILED", "Greeting quality validation failed.");
    }

    if (!providerResult) {
      throw new AiError("INVALID_PROVIDER_RESPONSE", "Provider result is missing.");
    }

    await completeAiGeneration({
      id: generationId,
      cardId: input.cardId,
      generationInput: { ...input, existingMessages },
      variants,
      provider: providerName,
      model: providerResult.model
    });

    logger.info("ai.participant_generated", "Participant AI draft generated", {
      cardId: input.cardId,
      provider: providerName,
      model: providerResult.model,
      greetingMode,
      selectedStyle: input.style,
      matrixGeneratedCount: greetingMode === "matrix" ? matrixGeneratedCount : undefined,
      selectedVariants: variants.map((variant) => variant.id),
      validationPassed: true,
      tokenUsage: greetingMode === "matrix" ? matrixUsage : undefined,
      remainingCardGenerations: reservation.usage.remaining
    });

    return {
      generationId,
      variants,
      usage: reservation.usage,
      messageLimit: input.messageLimit
    };
  } catch (error) {
    await releaseAiGeneration(generationId);
    throw error;
  }
};

export const generateBestQuotes = async (input: {
  cardId: string;
  recipientName: string;
  occasionText: string;
  contributions: Array<import("@/lib/cards/types").Contribution>;
}): Promise<AiBestQuotesResult> => {
  if (input.contributions.length < 2) {
    throw new AiError("VALIDATION", "Для выбора лучших фраз нужно хотя бы два поздравления.");
  }

  const providerName = getInsightsProviderName();
  const usageSummary = await getAiUsageSummary(input.cardId);
  const generationId = randomUUID();
  const reservation = await reserveAiGeneration({
    id: generationId,
    cardId: input.cardId,
    limit: usageSummary.limit,
    generationType: "best_quotes"
  });
  if (!reservation) throw new AiError("LIMIT_REACHED", "AI generation limit reached for this card.");

  try {
    let selectedItems = null;
    let model = "local-insights-v1";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const providerResult = providerName === "gigachat"
        ? await generateBestQuotesWithGigaChat({
            recipientName: input.recipientName,
            occasionText: input.occasionText,
            contributions: input.contributions.map(({ id, message }) => ({ id, message })),
            attempt
          })
        : { quotes: buildMockBestQuotes(input.contributions), model };
      model = providerResult.model;
      selectedItems = validateBestQuoteCandidates(providerResult.quotes, input.contributions);
      if (selectedItems) break;
    }

    if (!selectedItems) {
      selectedItems = validateBestQuoteCandidates(buildMockBestQuotes(input.contributions), input.contributions);
      model = `${model}-source-fallback`;
    }

    if (!selectedItems) {
      throw new AiError("INVALID_PROVIDER_RESPONSE", "Provider returned unsuitable best quotes.");
    }

    const insight = {
      cardId: input.cardId,
      type: "quotes" as const,
      items: selectedItems,
      sourceFingerprint: buildContributionFingerprint(input.contributions),
      provider: providerName,
      model,
      updatedAt: new Date().toISOString()
    };
    await saveAiCardInsight(insight);
    await completeAiUsageEvent({ id: generationId, provider: providerName, model });

    logger.info("ai.best_quotes_generated", "Best quotes generated for card", {
      cardId: input.cardId,
      provider: providerName,
      remainingCardGenerations: reservation.usage.remaining
    });

    return { insight, usage: reservation.usage };
  } catch (error) {
    await releaseAiGeneration(generationId);
    throw error;
  }
};

export const generateQualities = async (input: {
  cardId: string;
  recipientName: string;
  occasionText: string;
  contributions: Array<import("@/lib/cards/types").Contribution>;
}): Promise<AiQualitiesResult> => {
  if (input.contributions.length < 2) {
    throw new AiError("VALIDATION", "Для определения качеств нужно хотя бы два поздравления.");
  }

  const providerName = getInsightsProviderName();
  const usageSummary = await getAiUsageSummary(input.cardId);
  const generationId = randomUUID();
  const reservation = await reserveAiGeneration({
    id: generationId,
    cardId: input.cardId,
    limit: usageSummary.limit,
    generationType: "qualities"
  });
  if (!reservation) throw new AiError("LIMIT_REACHED", "AI generation limit reached for this card.");

  try {
    let selectedItems = null;
    let model = "local-insights-v1";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const providerResult = providerName === "gigachat"
        ? await generateQualitiesWithGigaChat({
            recipientName: input.recipientName,
            occasionText: input.occasionText,
            contributions: input.contributions.map(({ id, message }) => ({ id, message })),
            attempt
          })
        : { qualities: buildMockQualities(input.contributions), model };
      model = providerResult.model;
      selectedItems = validateQualityCandidates(providerResult.qualities, input.contributions);
      if (selectedItems) break;
    }

    if (!selectedItems) {
      selectedItems = validateQualityCandidates(buildMockQualities(input.contributions), input.contributions);
      model = `${model}-source-fallback`;
    }

    if (!selectedItems) {
      throw new AiError("INVALID_PROVIDER_RESPONSE", "Provider returned unsuitable qualities.");
    }

    const insight = {
      cardId: input.cardId,
      type: "qualities" as const,
      items: selectedItems,
      sourceFingerprint: buildContributionFingerprint(input.contributions),
      provider: providerName,
      model,
      updatedAt: new Date().toISOString()
    };
    await saveAiCardInsight(insight);
    await completeAiUsageEvent({ id: generationId, provider: providerName, model });

    logger.info("ai.qualities_generated", "Qualities generated for card", {
      cardId: input.cardId,
      provider: providerName,
      remainingCardGenerations: reservation.usage.remaining
    });

    return { insight, usage: reservation.usage };
  } catch (error) {
    await releaseAiGeneration(generationId);
    throw error;
  }
};
