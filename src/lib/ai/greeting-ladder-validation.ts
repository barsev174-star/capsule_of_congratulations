import type { LadderContext, LadderRawInput } from "@/lib/ai/greeting-ladder";

export type LadderVariantType = "safe" | "warm" | "expressive";
export type LadderVariant = { type: LadderVariantType; label: string; text: string };
export type LadderValidationIssue = {
  type: LadderVariantType;
  code: string;
  message: string;
};

const textLength = (value: string) => Array.from(value).length;

export const ensureLadderVariantAddress = (
  variant: LadderVariant,
  address: string
): LadderVariant => {
  const text = variant.text.trim();
  if (!text || normalize(text).includes(normalize(address))) return variant;
  const first = text.charAt(0).toLocaleLowerCase("ru-RU") + text.slice(1);
  return { ...variant, text: `${address}, ${first}` };
};

export const fitLadderVariantToLimit = (
  variant: LadderVariant,
  limit: number
): LadderVariant => {
  const text = variant.text.trim();
  const overflow = textLength(text) - limit;
  if (overflow <= 0 || overflow > 40) return variant;

  const sentences = text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length < 4) return variant;

  const compacted = [...sentences];
  while (compacted.length > 3 && textLength(compacted.join(" ")) > limit) {
    const interior = compacted
      .slice(1, -1)
      .map((sentence, index) => ({ index: index + 1, length: textLength(sentence) }))
      .sort((a, b) => a.length - b.length)[0];
    compacted.splice(interior.index, 1);
  }

  const fitted = compacted.join(" ");
  return textLength(fitted) <= limit ? { ...variant, text: fitted } : variant;
};

const normalize = (value: string) => value
  .toLocaleLowerCase("ru-RU")
  .replace(/ё/g, "е")
  .replace(/\s+/g, " ")
  .trim();

const informalPronoun = /(?<!\p{L})(?:ты|тебя|тебе|тобой|твой|твоя|тво[её]|твои)(?!\p{L})/iu;
const formalPronoun = /(?<!\p{L})(?:вы|вас|вам|вами|ваш|ваша|ваше|ваши)(?!\p{L})/iu;
const pluralAuthor = /(?<!\p{L})(?:мы|нам|нас|наш\p{L}*|поздравляем|желаем|ценим)(?!\p{L})/iu;
const genderedAuthor = /(?<!\p{L})я\s+(?:[\p{L}-]+\s+){0,3}(?:благодарн|был|была|справил|заимствовал|обязан|обязана)(?!\p{L})/iu;
const unsafeLanguage = /профессиональност|я\s+многое\s+тебе\s+обязан|старт\p{L}*,?\s+где|этап\p{L}*,?\s+где|принес\p{L}*[^.!?]{0,50}\s+и\s+чтобы|оценки\s+были\s+бы\s+другими/iu;
const forbiddenCliche = /работ\p{L}*\s+мечт|высок\p{L}*\s+зарплат|карьерн\p{L}*\s+(?:рост|лестниц)|профессиональн\p{L}*\s+развити|стабильн\p{L}*\s+доход|приятн\p{L}*\s+деньг/iu;
const variantLabelLeak = /^(?:аккуратно|теплее|живее)\s*(?:[—–:-]\s*)/iu;
const signatureRoleTokens = new Set([
  "родитель", "мама", "папа", "бабушка", "дедушка", "коллега", "друг", "подруга",
  "сосед", "сокурсник", "однокурсник", "семья", "друзья", "коллеги", "команда", "группа"
]);

const hasLikelyFemaleAuthorName = (fromLabel = "") => {
  const firstToken = normalize(fromLabel)
    .replace(/^от\s+/u, "")
    .split(/[\s,—–-]+/u)
    .find(Boolean);
  if (!firstToken || signatureRoleTokens.has(firstToken)) return false;
  return /(?:а|я)$/u.test(firstToken) && !new Set(["саша", "женя", "валя", "шура"]).has(firstToken);
};

const signatureTokens = (fromLabel = "") => normalize(fromLabel)
  .replace(/^от\s+(?:друга|подруги|родителя|сокурсника|коллеги|семьи|друзей|коллег)\s*/u, "")
  .split(/\s+/)
  .filter((token) => token.length >= 5 && !signatureRoleTokens.has(token));

export const validateLadderVariants = (
  variants: LadderVariant[],
  input: LadderRawInput,
  context: LadderContext,
  limits: Record<LadderVariantType, number>
) => {
  const issues: LadderValidationIssue[] = [];
  const reject = (type: LadderVariantType, code: string, message: string) => issues.push({ type, code, message });
  const addressTokens = new Set(normalize(context.address).split(/\s+/).filter(Boolean));
  const signatures = signatureTokens(input.fromLabel).filter((token) => !addressTokens.has(token));
  const mayUseFemaleAuthorForm = hasLikelyFemaleAuthorName(input.fromLabel);

  for (const variant of variants) {
    const text = variant.text.trim();
    const normalized = normalize(text);
    if (!text || Array.from(text).length > limits[variant.type]) reject(variant.type, "TOO_LONG", `сократи текст примерно до ${Math.max(100, limits[variant.type] - 30)} символов`);
    if (!normalized.includes(normalize(context.address))) reject(variant.type, "WRONG_ADDRESS", `используй обращение «${context.address}»`);
    if (context.addressMode === "tu" && formalPronoun.test(text)) reject(variant.type, "WRONG_PRONOUN", "используй обращение на «ты»");
    if (context.addressMode === "vy" && informalPronoun.test(text)) reject(variant.type, "WRONG_PRONOUN", "используй обращение на «вы»");
    if (context.authorNumber === "singular" && pluralAuthor.test(text)) reject(variant.type, "WRONG_AUTHOR_NUMBER", "поздравляет один человек; не используй «мы/поздравляем/желаем»");
    if (genderedAuthor.test(text) && !mayUseFemaleAuthorForm) reject(variant.type, "UNKNOWN_AUTHOR_GENDER", "не придумывай пол автора; используй нейтральную формулировку");
    if (signatures.some((token) => normalized.includes(token))) reject(variant.type, "FROM_LABEL_LEAK", "не вставляй имя или подпись автора");
    if (unsafeLanguage.test(text)) reject(variant.type, "AWKWARD_LANGUAGE", "перепиши неестественную или долговую формулировку проще");
    if (variantLabelLeak.test(text)) reject(variant.type, "VARIANT_LABEL_LEAK", "не вставляй название варианта в текст поздравления");
    if (forbiddenCliche.test(text)) reject(variant.type, "FORBIDDEN_CLICHE", "убери карьерный список и клише");
  }

  const rejected = new Set(issues.map((issue) => issue.type));
  return {
    issues,
    accepted: variants.filter((variant) => !rejected.has(variant.type)),
    rejectedTypes: [...rejected]
  };
};
