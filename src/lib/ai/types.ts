export type AiStyle =
  | "warm-simple"
  | "short-no-pathos"
  | "humor"
  | "touching"
  | "respectful";

export type AiVariantType = "short" | "warm" | "style";
export type AiMatrixVariantType = "short" | "warm" | AiStyle;
export type AiProviderName = "mock" | "gigachat" | "openai";
export type AiGenerationMode = "compose" | "improve" | "shorten";
export type AiGenerationType = "participant_message" | "best_quotes" | "qualities";
export type AiCardInsightType = "quotes" | "qualities";

export type AiGenerationRequest = {
  cardId: string;
  publicSlug?: string;
  manageToken?: string;
  contributionId?: string;
  relationshipContext?: string;
  draftNotes: string;
  style: AiStyle;
  mode?: AiGenerationMode;
};

export type AiGenerationInput = {
  cardId: string;
  recipientName: string;
  fromLabel?: string;
  relationshipContext?: string;
  occasionText: string;
  draftNotes: string;
  style: AiStyle;
  messageLimit: number;
  existingMessages?: string[];
  mode?: AiGenerationMode;
};

export type AiVariant = {
  id: AiVariantType;
  label: string;
  text: string;
};

export type AiMatrixVariant = {
  id: AiMatrixVariantType;
  label: string;
  text: string;
};

export type AiMatrixProviderResult = {
  variants: AiMatrixVariant[];
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
};

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
};

export type AiUsageSummary = AiUsage & {
  baseLimit: number;
  bonusLimit: number;
  isPaid: boolean;
};

export type AiCardInsightItem = {
  text: string;
  sourceContributionId: string;
};

export type AiCardInsight = {
  cardId: string;
  type: AiCardInsightType;
  items: AiCardInsightItem[];
  sourceFingerprint: string;
  provider: AiProviderName;
  model: string;
  updatedAt: string;
};

export type AiBestQuotesResult = {
  insight: AiCardInsight;
  usage: AiUsage;
};

export type AiQualitiesResult = {
  insight: AiCardInsight;
  usage: AiUsage;
};

export type AiGenerationResult = {
  generationId: string;
  variants: AiVariant[];
  usage: AiUsage;
  messageLimit: number;
};

export type AiProviderInput = Omit<AiGenerationInput, "cardId" | "fromLabel" | "existingMessages"> & {
  fromLabel: string;
  existingMessages: string[];
  attempt: number;
  validationFeedback?: string[];
  requestedVariantTypes?: AiVariantType[];
};

export type AiProviderResult = {
  variants: AiVariant[];
  model: string;
};

export type AiUsageReservation = {
  id: string;
  usage: AiUsage;
};

export type AiGenerationLog = {
  id: string;
  cardId: string;
  generationType: AiGenerationType;
  status: "pending" | "succeeded";
  inputJson?: string;
  outputText?: string;
  provider?: AiProviderName;
  model?: string;
  createdAt: string;
  completedAt?: string;
};

export type AiErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "LIMIT_REACHED"
  | "PROVIDER_CONFIG"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_JSON"
  | "AI_VALIDATION_FAILED"
  | "INVALID_PROVIDER_RESPONSE";

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AiError";
  }
}
