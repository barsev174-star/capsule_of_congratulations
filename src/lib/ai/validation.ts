import type { AiGenerationMode, AiGenerationRequest, AiStyle } from "@/lib/ai/types";

export const AI_DRAFT_LIMIT = 700;
export const AI_SHORTEN_DRAFT_LIMIT = 1500;
export const AI_DRAFT_MIN_LENGTH = 20;

export type AiValidationIssue = {
  field: string;
  message: string;
};

export type AiValidationResult =
  | { success: true; data: AiGenerationRequest }
  | { success: false; issues: AiValidationIssue[] };

const styles: AiStyle[] = ["warm-simple", "short-no-pathos", "humor", "touching", "respectful"];
const modes: AiGenerationMode[] = ["compose", "improve", "shorten"];

export const countCharacters = (value: string) => Array.from(value).length;

const normalizeText = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

const strongTechnicalPatterns = [
  /\bPOST\s+\/api\b/i,
  /\bGET\s+\/api\b/i,
  /\b(access_token|AI_PROVIDER|GIGACHAT_AUTH_KEY)\b/i,
  /(^|\s)\.env(\s|$)/i,
  /\b(import|export)\s+(type\s+)?[\w{*]/i,
  /\b(const|let|function)\s+[A-Za-z_$][\w$]*\s*(=|\()/,
  /```[\s\S]*```/,
  /\bcurl\s+(-[A-Z]|https?:\/\/)/i
];

const technicalTerms = [
  /\bAPI\b/i,
  /\bendpoint\b/i,
  /\bOAuth\b/i,
  /\bbackend\b/i,
  /\bfrontend\b/i,
  /\bJSON\b/i,
  /\bGigaChat\b/i,
  /\bOpenAI\b/i,
  /\bnpm\b/i,
  /\bTypeScript\b/i
];

export const containsTechnicalText = (value: string) =>
  strongTechnicalPatterns.some((pattern) => pattern.test(value)) ||
  technicalTerms.filter((pattern) => pattern.test(value)).length >= 2;

export const validateAiGenerationRequest = (input: unknown): AiValidationResult => {
  const body = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const issues: AiValidationIssue[] = [];
  const requestId = normalizeText(body.requestId);
  const cardId = normalizeText(body.cardId);
  const publicSlug = normalizeText(body.publicSlug);
  const manageToken = normalizeText(body.manageToken);
  const contributionId = normalizeText(body.contributionId);
  const relationshipContext = normalizeText(body.relationshipContext);
  const draftNotes = normalizeText(body.draftNotes ?? body.draft);
  const style = normalizeText(body.style);
  const requestedMode = normalizeText(body.mode) || "compose";
  const mode = modes.includes(requestedMode as AiGenerationMode)
    ? (requestedMode as AiGenerationMode)
    : "compose";
  const draftLength = countCharacters(draftNotes);
  const draftLimit = mode === "compose" ? AI_DRAFT_LIMIT : AI_SHORTEN_DRAFT_LIMIT;

  if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    issues.push({ field: "requestId", message: "Не удалось подтвердить запрос к AI-помощнику." });
  }

  if (!cardId) {
    issues.push({ field: "cardId", message: "Не удалось определить открытку для AI-помощника." });
  }

  if (!publicSlug && !manageToken) {
    issues.push({ field: "access", message: "Ссылка на открытку больше не актуальна." });
  }

  if (!draftNotes) {
    issues.push({
      field: "draftNotes",
      message: "Напишите несколько мыслей, а AI соберёт из них варианты поздравления."
    });
  } else if (draftLength < AI_DRAFT_MIN_LENGTH) {
    issues.push({
      field: "draftNotes",
      message: "Добавьте пару деталей — так AI сможет написать более личное поздравление."
    });
  } else if (draftLength > draftLimit) {
    issues.push({ field: "draftNotes", message: `Текст должен быть не длиннее ${draftLimit} символов.` });
  } else if (containsTechnicalText(draftNotes)) {
    issues.push({
      field: "draftNotes",
      message: "Напишите пару мыслей о человеке: за что хотите поблагодарить, что пожелать, какой он."
    });
  }

  if (!styles.includes(style as AiStyle)) {
    issues.push({ field: "style", message: "Выберите стиль поздравления." });
  }

  if (relationshipContext.length > 80) {
    issues.push({ field: "relationshipContext", message: "Подпись под именем должна быть не длиннее 80 символов." });
  }

  if (requestedMode && !modes.includes(requestedMode as AiGenerationMode)) {
    issues.push({ field: "mode", message: "Не удалось определить задачу для AI-помощника." });
  }

  if (mode !== "compose" && (!manageToken || !contributionId)) {
    issues.push({ field: "contributionId", message: "Не удалось определить поздравление для AI-редактирования." });
  }

  if (issues.length > 0) return { success: false, issues };

  return {
    success: true,
    data: {
      requestId: requestId || undefined,
      cardId,
      publicSlug: publicSlug || undefined,
      manageToken: manageToken || undefined,
      contributionId: contributionId || undefined,
      relationshipContext: relationshipContext || undefined,
      draftNotes,
      style: style as AiStyle,
      mode
    }
  };
};

export const validateAiGenerationFormData = (formData: FormData): AiValidationResult =>
  validateAiGenerationRequest({
    cardId: formData.get("cardId"),
    requestId: formData.get("requestId"),
    publicSlug: formData.get("publicSlug"),
    manageToken: formData.get("manageToken"),
    contributionId: formData.get("contributionId"),
    relationshipContext: formData.get("relationshipContext"),
    draftNotes: formData.get("draftNotes"),
    style: formData.get("style"),
    mode: formData.get("mode")
  });
