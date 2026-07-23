import type { GiftPollMode } from "./types";

export const GIFT_POLL_MIN_OPTIONS = 2;
export const GIFT_POLL_MAX_OPTIONS = 6;

export const normalizeGiftPollMode = (value: unknown): GiftPollMode => value === "budget" ? "budget" : "gift";

export const isSafeProductUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

export const normalizeBudgetAmount = (value: string) => {
  const normalized = value.trim().replace(/\s/g, "").replaceAll("₽", "");
  if (!/^\d{1,7}$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 1) return null;
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
};

export const getDefaultPollTitle = (mode: GiftPollMode) => mode === "budget" ? "Помогите выбрать бюджет" : "Помогите выбрать подарок";

export const getDefaultPollQuestion = (mode: GiftPollMode) => mode === "budget"
  ? "Какой бюджет лучше выбрать для подарка?"
  : "Какой вариант лучше выбрать для подарка?";

// `recipientName` remains optional for callers saved before the neutral defaults.
export const defaultGiftPollCopy = (mode: GiftPollMode, _recipientName?: string) => ({
  title: getDefaultPollTitle(mode),
  question: getDefaultPollQuestion(mode)
});

export const isSystemDefaultPollTitle = (value: string, mode: GiftPollMode) => value.trim() === getDefaultPollTitle(mode);

export const isSystemDefaultPollQuestion = (value: string, mode: GiftPollMode, recipientName?: string) => {
  const question = value.trim();
  if (!question || question === getDefaultPollQuestion(mode)) return true;
  const subject = recipientName?.trim() || "дорогому человеку";
  const legacyQuestion = mode === "budget"
    ? `Какой бюджет больше подойдёт для подарка ${subject}?`
    : `Какой вариант больше подойдёт ${subject}?`;
  return question === legacyQuestion;
};
