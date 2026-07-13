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
  const normalized = value.trim().replaceAll(" ", "").replaceAll("₽", "");
  if (!/^\d{1,7}$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 1) return null;
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
};

export const defaultGiftPollCopy = (mode: GiftPollMode, recipientName: string) => ({
  title: mode === "budget" ? "Помогите выбрать бюджет" : "Помогите выбрать подарок",
  question: mode === "budget"
    ? `Какой бюджет больше подойдёт для подарка ${recipientName || "дорогому человеку"}?`
    : `Какой вариант больше подойдёт ${recipientName || "дорогому человеку"}?`
});
