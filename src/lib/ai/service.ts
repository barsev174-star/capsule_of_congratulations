import { randomUUID } from "node:crypto";
import {
  completeAiUsageEvent,
  completeAiGeneration,
  getAiGenerationRequestState,
  getAiUsageSummary,
  releaseAiGeneration,
  reserveAiGeneration,
  saveAiCardInsight
} from "@/lib/ai/repository";
import { generateWithGigaChat } from "@/lib/ai/gigachat-provider";
import { generateBestQuotesWithOpenAi, generateQualitiesWithOpenAi } from "@/lib/ai/openai-insights-provider";
import {
  generateMatrixWithOpenAi,
  generateWithOpenAi,
  getOpenAiMatrixPromptVersion,
  OPENAI_GREETING_PROMPT_VERSION,
  OPENAI_MATRIX_PROMPT_V3,
  OPENAI_MATRIX_PROMPT_VERSION
} from "@/lib/ai/openai-provider";
import { buildMatrixSelections, inferRelationshipContext } from "@/lib/ai/greeting-matrix";
import {
  rankGreetingSelections,
  scoreGreetingSelection,
  scoreGreetingVariant,
  scoreStructureDiversity
} from "@/lib/ai/greeting-scoring";
import { inferAddressName, inferOccasionContext, normalizeOccasionForSentence } from "@/lib/ai/greeting-context";
import { cleanupGreetingText } from "@/lib/ai/greeting-cleanup";
import { buildLadderPrompt, buildLadderRetryPrompt } from "@/lib/ai/greeting-ladder";
import { ensureLadderVariantAddress, fitLadderVariantToLimit, validateLadderVariants } from "@/lib/ai/greeting-ladder-validation";
import { buildTwoStepComposePrompt, buildTwoStepPlanPrompt, buildTwoStepRepairPrompt } from "@/lib/ai/greeting-two-step";
import { buildSemanticPrompt, buildSemanticRepairPrompt, GREETING_PROMPT_VERSION, validateSemanticVariants } from "@/lib/ai/greeting-semantic";
import { generateSemanticGreetingWithOpenAi, repairSemanticGreetingWithOpenAi } from "@/lib/ai/openai-semantic-provider";

let localTemplateGenerationSequence = 0;
import { generateLadderWithOpenAi, OPENAI_LADDER_PROMPT_VERSION } from "@/lib/ai/openai-ladder-provider";
import { generateGreetingContentPlanWithOpenAi, generateTwoStepVariantsWithOpenAi } from "@/lib/ai/openai-two-step-provider";
import { extractDraftSpecifics } from "@/lib/ai/greeting-specifics";
import {
  BEST_QUOTE_MIN_CONTRIBUTION_COUNT,
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
  AiMatrixVariant,
  AiMatrixVariantType,
  AiStyle,
  AiVariant
} from "@/lib/ai/types";
import { logger } from "@/lib/logger";
import { recordTelemetryEvent } from "@/lib/telemetry-repository";

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
  (process.env.AI_INSIGHTS_PROVIDER ?? (process.env.OPENAI_API_KEY ? "openai" : "mock")) === "openai"
    ? "openai"
    : "mock";

const buildTargetedFeedback = (issues: ProviderVariantValidationIssue[]) => {
  const issue = issues.find((item) => item.severity === "hard")
    ?? issues.find((item) => item.severity === "soft");
  return issue ? [issue.message] : [];
};

const variantsWithoutHardIssues = (source: AiVariant[], issues: ProviderVariantValidationIssue[]) => {
  const rejected = new Set(
    issues.filter((issue) => issue.severity === "hard" && issue.type).map((issue) => issue.type)
  );
  return source.filter((variant) => !rejected.has(variant.id));
};

const buildSafeGreetingFallback = (input: AiGenerationInput): AiVariant[] => {
  const relationship = inferRelationshipContext(input);
  const { addressName } = inferAddressName(input.recipientName, relationship.relationshipType);
  const { occasionCategory, safeWishSummary } = inferOccasionContext(input);
  const eventPhrase = normalizeOccasionForSentence(input.occasionText) || "с этим важным событием";
  const gratitudePhrase = /помог/iu.test(input.draftNotes)
    ? "Спасибо за помощь"
    : /поддерж|выруч/iu.test(input.draftNotes)
      ? "Спасибо за поддержку"
      : "";
  const texts = occasionCategory === "gratitude"
    ? [
        `${addressName}, спасибо за добрые слова и поступки.`,
        `${addressName}, хочется сказать спасибо и пожелать больше приятных событий впереди.`,
        `${addressName}, примите искреннюю благодарность. Пусть этот день оставит тёплые воспоминания.`
      ]
    : gratitudePhrase
      ? [
          `${addressName}, ${eventPhrase}! ${gratitudePhrase}.`,
          `${addressName}, поздравляю! ${gratitudePhrase} — это многое значит.`,
          `${addressName}, ${gratitudePhrase.toLocaleLowerCase("ru-RU")}. Пусть ${safeWishSummary}.`
        ]
      : [
          `${addressName}, ${eventPhrase}! Пусть этот день принесёт радость.`,
          `${addressName}, поздравляю! Пусть этот повод оставит тёплые воспоминания.`,
          `${addressName}, примите тёплые поздравления. Пусть впереди будет больше приятных событий.`
        ];

  return (["short", "warm", "style"] as const).map((id, index) => ({
    id,
    label: id === "short" ? "Короткий" : id === "warm" ? "Душевный" : "Ваш стиль",
    text: cleanupGreetingText(fitTextToLimit(texts[index], input.messageLimit), input)
  }));
};

const collectSafeMatrixCandidates = (
  source: AiMatrixVariant[],
  input: AiGenerationInput,
  existingMessages: string[]
) => source.filter((candidate) => {
  if (/помог|поддерж|благодар|спасибо|выруч/iu.test(input.draftNotes) &&
      !/спасибо|благодар|помощ|поддерж|выруч/iu.test(candidate.text)) return false;
  const check = inspectProviderVariants({
    value: [
      { id: "short", label: "Короткий", text: "Поздравляю с этим событием." },
      { id: "warm", label: "Душевный", text: "Пусть этот день оставит тёплые воспоминания." },
      { id: "style", label: "Ваш стиль", text: candidate.text }
    ],
    maxLength: input.messageLimit,
    draftNotes: input.draftNotes,
    existingMessages,
    mode: input.mode ?? "compose",
    style: "warm-simple",
    recipientName: input.recipientName,
    relationshipContext: input.relationshipContext,
    occasionText: input.occasionText,
    enforcePromptRules: true,
    universalContextRules: true
  });
  return !check.issues.some((issue) => issue.type === "style" && issue.severity === "hard");
});

const rescueFromMatrixPool = (
  type: AiVariant["id"],
  pool: AiMatrixVariant[],
  selectedStyle: AiStyle,
  used: AiVariant[]
) => {
  const preferences: Record<AiVariant["id"], AiMatrixVariantType[]> = {
    short: ["short", "short-no-pathos", "warm-simple", "warm", "touching"],
    warm: ["warm", "touching", "warm-simple", "respectful", "short-no-pathos"],
    style: [selectedStyle, "warm-simple", "touching", "respectful", "humor"]
  };
  const ranked = [...pool].sort(
    (left, right) => {
      const leftRank = preferences[type].indexOf(left.id);
      const rightRank = preferences[type].indexOf(right.id);
      return (leftRank < 0 ? 999 : leftRank) - (rightRank < 0 ? 999 : rightRank);
    }
  );
  const candidate = ranked.find((item) => {
    if (type === "short" && (item.text.length > 180 || item.text.split(/[.!?]+/).filter(Boolean).length > 2)) return false;
    return used.every((variant) => textSimilarity(variant.text, item.text) < 0.82);
  });
  return candidate ? {
    id: type,
    label: type === "short" ? "Короткий" : type === "warm" ? "Душевный" : "Ваш стиль",
    text: candidate.text
  } : null;
};

export const generateParticipantMessage = async (input: AiGenerationInput): Promise<AiGenerationResult> => {
  const providerName = getProviderName(process.env.AI_GREETING_PROVIDER ?? process.env.AI_PROVIDER);
  const matrixRequested = process.env.AI_GREETING_MODE === "matrix";
  const ladderRequested = process.env.AI_GREETING_MODE === "ladder";
  const twoStepRequested = process.env.AI_GREETING_EXPERIMENT === "two_step" || process.env.AI_GREETING_EXPERIMENT === "semantic";
  // The editor's "Улучшить с AI" uses the same source text and needs the
  // same semantic safeguards as a newly composed participant message.
  // Shortening remains a separate, length-focused workflow.
  const supportsSpecialMode = providerName === "openai" && (input.mode ?? "compose") !== "shorten";
  const greetingMode = twoStepRequested && supportsSpecialMode
    ? "two_step"
    : ladderRequested && supportsSpecialMode
    ? "ladder"
    : matrixRequested && supportsSpecialMode
      ? "matrix"
      : "classic";
  const matrixPromptVersion = greetingMode === "matrix" ? getOpenAiMatrixPromptVersion() : undefined;
  const universalMatrix = matrixPromptVersion === OPENAI_MATRIX_PROMPT_VERSION || matrixPromptVersion === OPENAI_MATRIX_PROMPT_V3;
  const cleanupMatrix = matrixPromptVersion === OPENAI_MATRIX_PROMPT_VERSION;
  if (process.env.NODE_ENV !== "production" && (matrixRequested || ladderRequested || twoStepRequested) && greetingMode === "classic") {
    logger.warn("ai.special_mode_classic_fallback", "Selected greeting mode requires OpenAI compose generation; using classic", {
      provider: providerName,
      requestedMode: twoStepRequested ? "two_step" : process.env.AI_GREETING_MODE,
      mode: input.mode ?? "compose"
    });
  }
  const usageSummary = await getAiUsageSummary(input.cardId);
  const generationId = input.requestId ?? randomUUID();
  const existingRequest = await getAiGenerationRequestState(generationId, input.cardId);
  if (existingRequest?.status === "succeeded") {
    return { generationId, variants: existingRequest.variants, usage: usageSummary, messageLimit: input.messageLimit };
  }
  if (existingRequest?.status === "pending") {
    throw new AiError("AI_REQUEST_IN_PROGRESS", "AI generation request is already in progress.");
  }
  const reservation = await reserveAiGeneration({ id: generationId, cardId: input.cardId, limit: usageSummary.limit });

  if (!reservation) {
    const racedRequest = await getAiGenerationRequestState(generationId, input.cardId);
    if (racedRequest?.status === "succeeded") {
      return { generationId, variants: racedRequest.variants, usage: await getAiUsageSummary(input.cardId), messageLimit: input.messageLimit };
    }
    if (racedRequest?.status === "pending") {
      throw new AiError("AI_REQUEST_IN_PROGRESS", "AI generation request is already in progress.");
    }
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
  const matrixSafePool: AiMatrixVariant[] = [];
  const matrixSelectionPool: AiVariant[][] = [];

  try {
    if (greetingMode === "ladder") {
      const ladderInput = {
        recipientName: input.recipientName,
        occasionText: input.occasionText,
        fromLabel: input.fromLabel,
        relationshipContext: input.relationshipContext,
        draftNotes: input.draftNotes,
        messageLimit: input.messageLimit,
        existingMessages
      };
      const prompt = buildLadderPrompt(ladderInput);
      const requestedTypes = ["safe", "warm", "expressive"] as const;
      const initial = await generateLadderWithOpenAi({
        system: prompt.system,
        user: prompt.user,
        requestedTypes: [...requestedTypes],
        attempt: 1
      });
      const initialValidation = validateLadderVariants(initial.variants, ladderInput, prompt.context, prompt.limits);
      let finalVariants = initial.variants;
      let retryUsage: typeof initial.usage;

      if (initialValidation.rejectedTypes.length > 0) {
        const retryPrompt = buildLadderRetryPrompt(
          ladderInput,
          initialValidation.rejectedTypes.map((type) => ({
            type,
            reasons: initialValidation.issues.filter((issue) => issue.type === type).map((issue) => issue.message)
          })),
          initialValidation.accepted
        );
        const retry = await generateLadderWithOpenAi({
          system: retryPrompt.system,
          user: retryPrompt.user,
          requestedTypes: retryPrompt.requestedTypes,
          attempt: 2
        });
        retryUsage = retry.usage;
        const replacements = new Map(retry.variants.map((variant) => [variant.type, variant]));
        finalVariants = finalVariants.map((variant) => replacements.get(variant.type) ?? variant);
      }

      finalVariants = finalVariants.map((variant) => fitLadderVariantToLimit(
        ensureLadderVariantAddress(variant, prompt.context.address),
        prompt.limits[variant.type]
      ));
      const finalValidation = validateLadderVariants(finalVariants, ladderInput, prompt.context, prompt.limits);
      if (finalValidation.issues.length > 0) {
        logger.warn("ai.ladder_validation_failed", "Ladder variants failed final validation", {
          cardId: input.cardId,
          issueCodes: finalValidation.issues.map((issue) => issue.code),
          rejectedTypes: finalValidation.rejectedTypes
        });
        throw new AiError("AI_VALIDATION_FAILED", "Ladder greeting quality validation failed.");
      }

      variants = finalVariants.map((variant) => ({
        id: variant.type === "safe" ? "short" : variant.type === "warm" ? "warm" : "style",
        label: variant.label,
        text: variant.text
      }));
      providerResult = { variants, model: initial.model };
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
        promptVersion: OPENAI_LADDER_PROMPT_VERSION,
        selectedVariants: variants.map((variant) => variant.id),
        validationPassed: true,
        tokenUsage: {
          initial: initial.usage,
          retry: retryUsage,
          totalTokens: (initial.usage?.totalTokens ?? 0) + (retryUsage?.totalTokens ?? 0)
        },
        remainingCardGenerations: reservation.usage.remaining
      });
      return { generationId, variants, usage: reservation.usage, messageLimit: input.messageLimit };
    }

    if (greetingMode === "two_step") {
      const twoStepInput = {
        recipientName: input.recipientName,
        occasionText: input.occasionText,
        fromLabel: input.fromLabel,
        relationshipContext: input.relationshipContext,
        draftNotes: input.draftNotes,
        messageLimit: input.messageLimit,
        existingMessages
      };
      const semanticPrompt = buildSemanticPrompt(twoStepInput);
      const semanticResult = await generateSemanticGreetingWithOpenAi(semanticPrompt);
      let semanticVariants = semanticResult.variants;
      let semanticValidation = validateSemanticVariants(semanticVariants, semanticPrompt.limits);
      let repairUsage: typeof semanticResult.usage;
      const repairError = semanticValidation.hardErrors[0];
      if (repairError) {
        const repairPrompt = buildSemanticRepairPrompt(semanticPrompt, semanticResult.plan, repairError.type, semanticVariants[repairError.type].text, repairError.code);
        const repair = await repairSemanticGreetingWithOpenAi(repairPrompt, repairError.type);
        repairUsage = repair.usage;
        semanticVariants = { ...semanticVariants, [repairError.type]: { text: repair.text } };
        semanticValidation = validateSemanticVariants(semanticVariants, semanticPrompt.limits);
      }
      if (semanticValidation.hardErrors.length > 0) throw new AiError("AI_VALIDATION_FAILED", "Semantic greeting has an objective format error.");
      logger.info("ai.semantic_generation", "Semantic greeting diagnostics", {
        cardId: input.cardId, promptVersion: GREETING_PROMPT_VERSION, durationMs: semanticResult.durationMs,
        repairUsed: Boolean(repairError), repairReason: repairError?.code,
        hardErrors: semanticValidation.hardErrors, softWarnings: semanticValidation.softWarnings,
        variantLengths: semanticValidation.entries.map((entry) => ({ type: entry.type, length: Array.from(entry.text).length, limit: semanticPrompt.limits[entry.type] })),
        tokenUsage: { main: semanticResult.usage, repair: repairUsage }
      });
      try {
        await recordTelemetryEvent({
          kind: "funnel",
          event: "ai.semantic_generation",
          cardId: input.cardId,
          errorId: null,
          context: {
            promptVersion: GREETING_PROMPT_VERSION,
            mainDurationMs: semanticResult.durationMs,
            repairUsed: Boolean(repairError),
            repairReason: repairError?.code ?? null,
            hardErrorCodes: semanticValidation.hardErrors.map((item) => item.code),
            softWarningCodes: semanticValidation.softWarnings.map((item) => item.code),
            variantLengths: semanticValidation.entries.map((entry) => ({ type: entry.type, length: Array.from(entry.text).length, limit: semanticPrompt.limits[entry.type] })),
            inputTokens: semanticResult.usage?.inputTokens ?? null,
            outputTokens: semanticResult.usage?.outputTokens ?? null,
            repairTokens: repairUsage?.totalTokens ?? null
          }
        });
      } catch {
        logger.warn("ai.semantic_telemetry_failed", "Semantic greeting diagnostics could not be persisted", { cardId: input.cardId });
      }
      variants = (["safe", "warm", "expressive"] as const).map((type) => ({
        id: type === "safe" ? "short" : type === "warm" ? "warm" : "style",
        label: type === "safe" ? "Аккуратно" : type === "warm" ? "Теплее" : "Живее",
        text: semanticVariants[type].text.trim()
      }));
      providerResult = { variants, model: semanticResult.model };
      await completeAiGeneration({
        id: generationId,
        cardId: input.cardId,
        generationInput: { ...input, existingMessages },
        variants,
        provider: providerName,
        model: providerResult.model
      });
      logger.info("ai.participant_generated", "Participant two-step AI draft generated", {
        cardId: input.cardId,
        provider: providerName,
        model: providerResult.model,
        greetingMode,
        promptVersion: GREETING_PROMPT_VERSION,
        selectedVariants: variants.map((variant) => variant.id),
        validationPassed: true,
        tokenUsage: {
          main: semanticResult.usage,
          repair: repairUsage,
          totalTokens: (semanticResult.usage?.totalTokens ?? 0) + (repairUsage?.totalTokens ?? 0)
        },
        remainingCardGenerations: reservation.usage.remaining
      });
      return { generationId, variants, usage: reservation.usage, messageLimit: input.messageLimit };
    }

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
          if (universalMatrix) {
            for (const candidate of collectSafeMatrixCandidates(matrixResult.variants, input, existingMessages)) {
              if (!matrixSafePool.some((saved) => textSimilarity(saved.text, candidate.text) >= 0.9)) {
                matrixSafePool.push(candidate);
              }
            }
          }
          const selections = universalMatrix
            ? rankGreetingSelections(buildMatrixSelections(matrixResult.variants, input.style), input)
            : buildMatrixSelections(matrixResult.variants, input.style);
          if (process.env.NODE_ENV !== "production" && cleanupMatrix) {
            const context = inferOccasionContext(input);
            const specifics = extractDraftSpecifics(input.draftNotes);
            logger.info("ai.openai_matrix_scoring", "Scored OpenAI matrix variants", {
              promptVersion: matrixPromptVersion,
              model: matrixResult.model,
              tokenUsage: matrixResult.usage,
              relationshipType: inferRelationshipContext(input).relationshipType,
              occasionCategory: context.occasionCategory,
              wishTopics: context.wishTopics,
              overloadedWishTopics: context.overloadedWishTopics,
              safeWishSummary: context.safeWishSummary,
              specificFacts: specifics.specificFacts,
              strongDetails: specifics.strongDetails,
              personalConsequences: specifics.personalConsequences,
              concreteActions: specifics.concreteActions,
              concreteQualities: specifics.concreteQualities,
              weakGenericDetails: specifics.weakGenericDetails,
              variants: matrixResult.variants.map((variant) => ({
                type: variant.id,
                text: variant.text,
                ...scoreGreetingVariant({ id: "style", label: variant.label, text: variant.text }, input)
              }))
            });
          }
          const checkedSelections = selections.map((candidate) => {
            const check = inspectProviderVariants({
              value: candidate,
              maxLength: input.messageLimit,
              draftNotes: input.draftNotes,
              existingMessages,
              mode: input.mode ?? "compose",
              style: input.style,
              recipientName: input.recipientName,
              relationshipContext: input.relationshipContext,
              occasionText: input.occasionText,
              enforcePromptRules: true,
              universalContextRules: universalMatrix
            });
            return { candidate, check };
          });
          if (universalMatrix) {
            matrixSelectionPool.push(
              ...checkedSelections
                .filter(({ check }) => !check.issues.some((issue) => issue.severity === "hard"))
                .map(({ candidate }) => candidate)
            );
          }
          const selected = universalMatrix
            ? checkedSelections
                .filter(({ check }) => !check.issues.some((issue) => issue.severity === "hard"))
                .sort((left, right) => {
                  const issueDifference = left.check.issues.length - right.check.issues.length;
                  return issueDifference || scoreGreetingSelection(right.candidate, input) - scoreGreetingSelection(left.candidate, input);
                })[0]?.candidate
                ?? selections[0]
            : checkedSelections.find(({ check }) => check.variants.length === 3)?.candidate ?? selections[0];
          if (process.env.NODE_ENV !== "production" && cleanupMatrix) {
            const diversity = scoreStructureDiversity(selected, input);
            logger.info("ai.openai_matrix_selection", "Selected OpenAI greeting trio", {
              structureDiversityScore: diversity.score,
              repetitiveStructureIssues: diversity.issues,
              occasionTextCount: diversity.occasionCount,
              occasionPlacement: diversity.structures.map((structure, index) => ({
                type: selected[index].id,
                placement: structure.occasionPlacement
              })),
              selected: selected.map((variant) => ({
                type: variant.id,
                text: variant.text,
                styleFitIssues: scoreGreetingVariant(variant, input).softIssues
              }))
            });
          }
          providerResult = {
            variants: selected,
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
                : buildVariants(input, reservation.usage.used - 1 + attempt + localTemplateGenerationSequence++),
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

      if (cleanupMatrix && providerResult) {
        providerResult = {
          ...providerResult,
          variants: providerResult.variants.map((variant) => ({
            ...variant,
            text: cleanupGreetingText(variant.text, input)
          }))
        };
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
        occasionText: input.occasionText,
        enforcePromptRules: providerName !== "mock",
        universalContextRules: universalMatrix
      });

      lastValidationIssues = validation.issues;
      validationFeedback = universalMatrix
        ? buildTargetedFeedback(validation.issues)
        : validation.issues.map((issue) => issue.message);

      if (process.env.NODE_ENV !== "production") {
        logger.info("ai.participant_validation_result", "AI greeting validation completed", {
          provider: providerName,
          model: providerResult.model,
          greetingMode,
          mode: input.mode ?? "compose",
          style: input.style,
          promptVersion: providerName === "openai"
            ? greetingMode === "matrix" ? matrixPromptVersion : OPENAI_GREETING_PROMPT_VERSION
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
      const safeCandidates = universalMatrix
        ? variantsWithoutHardIssues(providerResult.variants, validation.issues)
        : validation.variants;
      for (const candidate of safeCandidates) {
        const duplicatesAcceptedType = [...acceptedVariants.values()].some(
          (accepted) => accepted.id !== candidate.id && textSimilarity(accepted.text, candidate.text) === 1
        );
        if (duplicatesAcceptedType) {
          validationFeedback.push(`${candidate.id}: сделай текст отличающимся от уже принятого варианта`);
          continue;
        }
        const repeatedPhrase = providerName === "mock" || cleanupMatrix
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
      if (universalMatrix && providerResult) {
        const rescued = new Map(acceptedVariants);
        for (const type of ["short", "warm", "style"] as const) {
          if (rescued.has(type)) continue;
          const candidate = rescueFromMatrixPool(type, matrixSafePool, input.style, [...rescued.values()]);
          if (candidate) rescued.set(type, candidate);
        }
        const fallback = buildSafeGreetingFallback(input);
        variants = (["short", "warm", "style"] as const).map(
          (type) => rescued.get(type) ?? fallback.find((variant) => variant.id === type)!
        );
        providerResult = { ...providerResult, model: `${providerResult.model}-safe-fallback` };
        logger.warn("ai.participant_safe_fallback", "Using safe local greeting fallback", {
          cardId: input.cardId,
          acceptedTypes: [...acceptedVariants.keys()],
          rescuedTypes: [...rescued.keys()].filter((type) => !acceptedVariants.has(type)),
          fallbackTypes: variants.filter((variant) => !rescued.has(variant.id)).map((variant) => variant.id)
        });
      }
    }

    if (variants && universalMatrix && matrixSelectionPool.length > 0) {
      const bestSelection = rankGreetingSelections(matrixSelectionPool, input)[0];
      if (scoreGreetingSelection(bestSelection, input) > scoreGreetingSelection(variants, input)) {
        variants = bestSelection;
      }
    }


    if (variants && cleanupMatrix) {
      variants = variants.map((variant) => ({
        ...variant,
        text: cleanupGreetingText(variant.text, input)
      }));
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
      promptVersion: matrixPromptVersion,
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
  if (input.contributions.length < BEST_QUOTE_MIN_CONTRIBUTION_COUNT) {
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
      const providerResult = providerName === "openai"
        ? await generateBestQuotesWithOpenAi({
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
      const providerResult = providerName === "openai"
        ? await generateQualitiesWithOpenAi({
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
