import { normalizeOccasionForSentence } from "@/lib/ai/greeting-context";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanupFromLabelTail = (text: string, fromLabel?: string) => {
  const label = fromLabel?.trim();
  if (!label) return text;
  const tail = new RegExp(
    `\\s*${escapeRegExp(label)}(?:\\s+с\\s+[\\p{L}\\s-]+|,\\s*[\\p{L}\\s-]+)?[.!?]*$`,
    "iu"
  );
  return text.replace(tail, "");
};

const cleanupOccasion = (text: string, occasionText: string) => {
  const occasion = normalizeOccasionForSentence(occasionText);
  if (!occasion) return text;
  const pattern = new RegExp(escapeRegExp(occasion), "giu");
  let seen = false;
  return text.replace(pattern, (match, offset: number) => {
    if (seen) return "";
    seen = true;
    const startsSentence = offset === 0 || /[.!?]\s*$/u.test(text.slice(0, offset));
    const normalized = match.toLocaleLowerCase("ru-RU");
    return startsSentence
      ? normalized.charAt(0).toLocaleUpperCase("ru-RU") + normalized.slice(1)
      : normalized;
  });
};

export const cleanupGreetingText = (
  text: string,
  context: { fromLabel?: string; occasionText: string }
) => cleanupOccasion(cleanupFromLabelTail(text, context.fromLabel), context.occasionText)
  .replace(/(без\s+(?:тебя|вас|твоей\s+помощи|вашей\s+помощи)[^.!?]{0,70}(?<!\p{L})оценк\p{L}*\s+)были\s+хуже/giu, "$1были бы хуже")
  .replace(/^[\s–—-]+/u, "")
  .replace(/\s+([,.;!?])/g, "$1")
  .replace(/([.!?])(?:\s*[.!?])+/g, "$1")
  .replace(/[,;:]\s*([.!?])/g, "$1")
  .replace(/\s{2,}/g, " ")
  .trim();
