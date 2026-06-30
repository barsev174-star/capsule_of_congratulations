import type { AiGenerationMode, AiStyle, AiVariant, AiVariantType } from "@/lib/ai/types";
import { containsTechnicalText, countCharacters } from "@/lib/ai/validation";

const variantTypes: AiVariantType[] = ["short", "warm", "style"];
const labels: Record<AiVariantType, string> = {
  short: "Короткий",
  warm: "Душевный",
  style: "Ваш стиль"
};

const forbiddenClichePatterns = [
  /знаменательн\p{L}*\s+событ/iu,
  /преданност\p{L}*\s+дел/iu,
  /мудр\p{L}*\s+руководств/iu,
  /успех\p{L}*\s+во\s+вс[её]м/iu,
  /сам\p{L}*\s+смел\p{L}*\s+мечт/iu,
  /блестящ\p{L}*\s+карьер/iu,
  /карьер\p{L}*\s+взлета\p{L}*\s+до\s+небес/iu,
  /надежн\p{L}*\s+друг/iu,
  /научн\p{L}*\s+график/iu,
  /экспонент/iu,
  /низк\p{L}*\s+поклон/iu,
  /бесценн\p{L}*\s+труд/iu
];

const careerClichePatterns = [
  /работ\p{L}*\s+мечт/iu,
  /профессиональн\p{L}*\s+рост/iu,
  /карьерн\p{L}*\s+рост/iu,
  /успешн\p{L}*\s+карьер/iu,
  /карьер\p{L}*\s+(?:будет\s+)?успешн/iu,
  /карьер\p{L}*\s+стремительн\p{L}*\s+раст/iu,
  /карьер\p{L}*\s+(?:стремительн\p{L}*|взлета\p{L}*)/iu,
  /стремительн\p{L}*\s+(?:карьерн\p{L}*\s+)?рост/iu,
  /двига\p{L}*\s+вверх\s+по\s+карьерн\p{L}*\s+лестниц/iu,
  /карьерн\p{L}*\s+(?:лестниц|высот)/iu,
  /высок\p{L}*\s+должност/iu,
  /достой\p{L}*\s+оплат\p{L}*\s+труд/iu,
  /дел\p{L}*\s+всей\s+жизн/iu,
  /(?:ярк|прибыльн)\p{L}*\s+карьер/iu,
  /высок\p{L}*\s+доход/iu,
  /(?:высок\p{L}*\s+оплат|оплат\p{L}*\s+высок)/iu,
  /хорош\p{L}*\s+доход/iu,
  /замечательн\p{L}*\s+работ/iu
];

const hardClichePatterns = [
  /(?<!\p{L})работ\p{L}*\s+мечт\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})(?:высок\p{L}*|достойн\p{L}*)\s+зарплат\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})(?:карьерн\p{L}*|профессиональн\p{L}*)\s+рост\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})стремительн\p{L}*\s+карьерн\p{L}*/iu,
  /(?<!\p{L})карьерн\p{L}*\s+(?:взл[её]т\p{L}*|лестниц\p{L}*|развити\p{L}*)/iu,
  /(?<!\p{L})рост\p{L}*\s+по\s+служб\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})достойн\p{L}*\s+оплат\p{L}*\s+труд\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})высок\p{L}*\s+доход\p{L}*(?!\p{L})/iu,
  /(?<!\p{L})оставайся\s+так\p{L}*\s+же(?!\p{L})/iu
];

const weakCareerPatterns = [
  /интересн\p{L}*\s+проект/iu,
  /больш\p{L}*\s+успех/iu
];

const promptLeakagePatterns = [
  /(?<!\p{L})хочу\s+поздравить(?!\p{L})/iu,
  /(?<!\p{L})нужно\s+пожелать(?!\p{L})/iu,
  /(?<!\p{L})мысли\s+пользователя(?!\p{L})/iu,
  /(?<!\p{L})выбранн\p{L}*\s+стил/iu,
  /(?<!\p{L})получатель\s*:/iu,
  /(?<!\p{L})надпись\s+события(?!\p{L})/iu,
  /(?<!\p{L})поздравить\p{L}*\s+(?:с\s+\p{L}+[,.]?\s+)?сокурсни/iu
];

const negativeHumorPatterns = [/головн\p{L}*\s+бол/iu];

const literalWishPatterns = [
  /работ\p{L}*\s+мечт/iu,
  /высок\p{L}*\s+зарплат/iu,
  /(?:карьерн|профессиональн)\p{L}*\s+рост/iu
];

const outputWishCategoryPatterns = [
  /(?:работ\p{L}*|дел\p{L}*\s+по\s+душ)/iu,
  /(?:зарплат|оплат|доход)/iu,
  /(?:карьер|профессиональн\p{L}*\s+рост)/iu
];

const naturalWishRephrasingPatterns = [
  /зарплат\p{L}*,?\s+котор\p{L}*\s+раду/iu,
  /доход\p{L}*,?\s+котор\p{L}*\s+раду/iu,
  /где\s+(?:тебя\s+)?ценят[\s\S]{0,60}\bхорошо\s+платят/iu
];

const patronymicPattern = /(?<!\p{L})\p{Lu}\p{Ll}*(?:ович|евич|ич|овна|евна|ична)(?!\p{L})/u;
const informalRolePattern = /(?:друг|подруг|сокурс|брат|сестр|муж|жен|мам|пап|родствен|близк\w*\s+коллег)/iu;
const formalRolePattern = /(?:учител|воспитател|руководител|начальник|старш\w*\s+коллег|клиент|преподавател)/iu;
const informalPronounPattern = /(?<!\p{L})(?:ты|тебя|тебе|тобой|твой|твоя|твоё|твои)(?!\p{L})/iu;
const formalPronounPattern = /(?<!\p{L})(?:вы|вас|вам|вами|ваш|ваша|ваше|ваши)(?!\p{L})/iu;
const inventedFormalRolePattern = /(?:наставник|наставниц|учител|преподавател|руководител|начальник|мудрост|ваши\s+советы)/iu;
const emojiPattern = /\p{Extended_Pictographic}/u;
const inventedDiminutivePattern = /^(?:(?:дорогая|дорогой)\s+)?[А-ЯЁ][а-яё]*(?:ечк|еньк|оньк|ушк|юшк|очк)[а-яё]*,/u;
const inventedCloseAddressPattern = /^(?:дорогая|дорогой|любимая|любимый)(?!\p{L})/iu;
const genderPlaceholderPattern = /\p{L}+\([а-яё]\)/iu;
const singularAuthorPattern = /(?<!\p{L})(?:я|мне|меня|мой|моя|моё|мои|хочу|желаю|поздравляю)(?!\p{L})/iu;
const pluralAuthorPattern = /(?<!\p{L})(?:мы|нам|нас|наши|поздравляем|желаем)(?!\p{L})/iu;
const stiffPeerPattern = /(?<!\p{L})профессионализм\p{L}*(?!\p{L})/iu;
const inventedWorkStereotypePattern = /(?<!\p{L})(?:начальств\p{L}*|работодател\p{L}*|преми\p{L}*|отпуск\p{L}*|опаздыва\p{L}*)(?!\p{L})/iu;

const normalizeComparable = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[«»„“”]/g, '"')
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const trigrams = (value: string) => {
  const normalized = normalizeComparable(value);
  const result = new Set<string>();

  for (let index = 0; index <= normalized.length - 3; index += 1) {
    result.add(normalized.slice(index, index + 3));
  }

  return result;
};

export const textSimilarity = (left: string, right: string) => {
  const leftNormalized = normalizeComparable(left);
  const rightNormalized = normalizeComparable(right);

  if (!leftNormalized || !rightNormalized) return 0;
  if (leftNormalized === rightNormalized) return 1;

  const leftParts = trigrams(leftNormalized);
  const rightParts = trigrams(rightNormalized);
  if (leftParts.size === 0 || rightParts.size === 0) return 0;

  let intersection = 0;
  for (const part of leftParts) {
    if (rightParts.has(part)) intersection += 1;
  }

  return intersection / (leftParts.size + rightParts.size - intersection);
};

type ProviderValidationInput = {
  value: unknown;
  maxLength: number;
  draftNotes: string;
  existingMessages: string[];
  mode?: AiGenerationMode;
  style?: AiStyle;
  recipientName?: string;
  relationshipContext?: string;
  enforcePromptRules?: boolean;
};

export type ProviderVariantValidationIssue = {
  type?: AiVariantType;
  code: AiValidationReason;
  severity: "hard" | "soft";
  message: string;
};

export type AiValidationReason =
  | "MISSING_VARIANTS"
  | "TOO_LONG"
  | "FORBIDDEN_PHRASE"
  | "FORMAL_ADDRESS_FOR_PEER"
  | "DUPLICATE_OPENING"
  | "TOO_SIMILAR"
  | "COPIED_DRAFT";

export type ProviderVariantValidationResult = {
  variants: AiVariant[];
  issues: ProviderVariantValidationIssue[];
};

export const inspectProviderVariants = (input: ProviderValidationInput): ProviderVariantValidationResult => {
  const rawVariants = Array.isArray(input.value)
    ? input.value
    : input.value && typeof input.value === "object" && Array.isArray((input.value as { variants?: unknown }).variants)
      ? (input.value as { variants: unknown[] }).variants
      : null;

  const variants: AiVariant[] = [];
  const issues: ProviderVariantValidationIssue[] = [];

  if (!rawVariants) {
    return {
      variants,
      issues: [{
        code: "MISSING_VARIANTS",
        severity: "hard",
        message: "верни объект variants с тремя вариантами"
      }]
    };
  }

  if (rawVariants.length !== 3) {
    issues.push({
      code: "MISSING_VARIANTS",
      severity: "hard",
      message: "верни ровно три варианта: short, warm и style"
    });
  }

  for (let index = 0; index < Math.min(rawVariants.length, 3); index += 1) {
    const item = rawVariants[index];
    if (!item || typeof item !== "object") {
      issues.push({
        code: "MISSING_VARIANTS",
        severity: "hard",
        message: `вариант ${index + 1} должен быть объектом с текстом`
      });
      continue;
    }

    const raw = item as Record<string, unknown>;
    const explicitType = raw.type ?? raw.id;
    const type = variantTypes.includes(explicitType as AiVariantType)
      ? (explicitType as AiVariantType)
      : variantTypes[index];
    const text = typeof raw.text === "string" ? raw.text.replace(/\s+/g, " ").trim() : "";

    const reject = (code: AiValidationReason, severity: "hard" | "soft", message: string) => {
      issues.push({ type, code, severity, message: `${type}: ${message}` });
    };

    if (!text) {
      reject("MISSING_VARIANTS", "hard", "добавь непустой текст");
      continue;
    }
    if (countCharacters(text) > input.maxLength) {
      reject("TOO_LONG", "hard", `сократи текст до ${input.maxLength} символов`);
      continue;
    }
    if (containsTechnicalText(text)) {
      reject("FORBIDDEN_PHRASE", "hard", "убери технические инструкции и служебный текст");
      continue;
    }
    if (input.mode === "shorten" && countCharacters(text) >= countCharacters(input.draftNotes)) {
      reject("COPIED_DRAFT", "soft", "сделай текст короче исходного");
      continue;
    }
    const normalizedText = normalizeComparable(text);
    const normalizedDraft = normalizeComparable(input.draftNotes);
    const draftSimilarity = textSimilarity(text, input.draftNotes);
    const substantiallyCopiesDraft = normalizedDraft.length >= 40 &&
      normalizedText.length >= normalizedDraft.length * 0.72 &&
      draftSimilarity >= 0.82;
    if (draftSimilarity === 1 || substantiallyCopiesDraft) {
      reject("COPIED_DRAFT", "hard", "полностью перепиши черновик, сохранив только его смысл и факты");
      continue;
    }
    if (input.existingMessages.some((message) => textSimilarity(text, message) >= 0.9)) {
      reject("TOO_SIMILAR", "soft", "не повторяй уже добавленное поздравление");
      continue;
    }
    if (variants.some((variant) => textSimilarity(text, variant.text) === 1)) {
      reject("TOO_SIMILAR", "soft", "сделай вариант отличающимся от остальных");
      continue;
    }
    if (variants.some((variant) => variant.id === type)) {
      reject("MISSING_VARIANTS", "hard", `верни только один вариант типа ${type}`);
      continue;
    }
    if (input.enforcePromptRules !== false &&
      forbiddenClichePatterns.some((pattern) => pattern.test(text) && !pattern.test(input.draftNotes))
    ) {
      reject("FORBIDDEN_PHRASE", "soft", "убери официальное клише и перефразируй естественно");
      continue;
    }
    if (input.enforcePromptRules !== false && careerClichePatterns.some((pattern) => pattern.test(text))) {
      reject(
        "FORBIDDEN_PHRASE",
        "soft",
        "не повторяй карьерные клише; скажи живее: работа, куда хочется идти, место, где ценят, доход, который радует"
      );
    }
    if (input.enforcePromptRules !== false && hardClichePatterns.some((pattern) => pattern.test(text))) {
      reject(
        "FORBIDDEN_PHRASE",
        "hard",
        "не используй карьерные клише: перефразируй как дело по душе, место, где ценят, доход, который радует"
      );
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      weakCareerPatterns.some((pattern) => pattern.test(text) && !pattern.test(input.draftNotes))
    ) {
      reject("FORBIDDEN_PHRASE", "soft", "убери добавленное моделью общее карьерное клише");
    }
    if (input.enforcePromptRules !== false && promptLeakagePatterns.some((pattern) => pattern.test(text))) {
      reject("FORBIDDEN_PHRASE", "hard", "убери служебную формулировку из черновика или prompt");
      continue;
    }
    if (input.enforcePromptRules !== false && genderPlaceholderPattern.test(text)) {
      reject("FORBIDDEN_PHRASE", "hard", "не используй скобки или варианты рода в готовом поздравлении");
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      inventedCloseAddressPattern.test(text) &&
      !inventedCloseAddressPattern.test(input.draftNotes)
    ) {
      reject("FORBIDDEN_PHRASE", "hard", "не добавляй обращение, которое придумывает степень близости");
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      singularAuthorPattern.test(input.draftNotes) &&
      !pluralAuthorPattern.test(input.draftNotes) &&
      pluralAuthorPattern.test(text)
    ) {
      reject("FORBIDDEN_PHRASE", "hard", "сохрани личный голос автора: используй я/поздравляю/желаю, а не мы/поздравляем/желаем");
      continue;
    }
    if (input.enforcePromptRules !== false && negativeHumorPatterns.some((pattern) => pattern.test(text))) {
      reject(
        "FORBIDDEN_PHRASE",
        "soft",
        input.style === "humor"
          ? "юмор неуместный: используй одну добрую шутку про учёбу, оценки или помощь, без негативных образов"
          : "убери негативный образ"
      );
      continue;
    }
    const draftWishCount = literalWishPatterns.filter((pattern) => pattern.test(input.draftNotes)).length;
    const repeatedWishCount = outputWishCategoryPatterns.filter((pattern) => pattern.test(text)).length;
    const hasNaturalRephrasing = naturalWishRephrasingPatterns.some((pattern) => pattern.test(text));
    if (
      input.enforcePromptRules !== false &&
      draftWishCount >= 2 &&
      repeatedWishCount >= 2 &&
      !hasNaturalRephrasing
    ) {
      reject(
        "FORBIDDEN_PHRASE",
        "soft",
        "не повторяй пожелания списком; преобразуй их в естественную человеческую фразу"
      );
    }
    if (
      input.enforcePromptRules !== false &&
      inventedDiminutivePattern.test(text) &&
      !inventedDiminutivePattern.test(input.draftNotes)
    ) {
      reject("FORBIDDEN_PHRASE", "soft", "не используй уменьшительную форму имени, которой нет в черновике");
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      input.recipientName &&
      !patronymicPattern.test(input.recipientName) &&
      patronymicPattern.test(text)
    ) {
      reject("FORBIDDEN_PHRASE", "hard", "не добавляй отчество, которого нет во входных данных");
      continue;
    }

    const relationship = input.relationshipContext ?? "";
    const draftUsesInformal = informalPronounPattern.test(input.draftNotes);
    const draftUsesFormal = formalPronounPattern.test(input.draftNotes);
    const requiresInformal = draftUsesInformal || (!draftUsesFormal && informalRolePattern.test(relationship));
    const requiresFormal = draftUsesFormal || (!draftUsesInformal && formalRolePattern.test(relationship));
    if (input.enforcePromptRules !== false && requiresInformal && formalPronounPattern.test(text)) {
      reject("FORMAL_ADDRESS_FOR_PEER", "hard", "используй обращение на ты, без вы/вам/вас/ваш");
      continue;
    }
    if (input.enforcePromptRules !== false && stiffPeerPattern.test(text) && !stiffPeerPattern.test(input.draftNotes)) {
      reject("FORBIDDEN_PHRASE", "hard", "для равного человека замени слово «профессионализм» живой конкретной формулировкой");
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      inventedWorkStereotypePattern.test(text) &&
      !inventedWorkStereotypePattern.test(input.draftNotes)
    ) {
      reject("FORBIDDEN_PHRASE", "hard", "не придумывай работодателей, начальство, премии, отпуск или другие рабочие детали");
      continue;
    }
    if (
      input.enforcePromptRules !== false &&
      requiresInformal &&
      inventedFormalRolePattern.test(text) &&
      !inventedFormalRolePattern.test(input.draftNotes)
    ) {
      reject("FORBIDDEN_PHRASE", "soft", "не придумывай официальную роль, которой нет в черновике");
      continue;
    }
    if (input.enforcePromptRules !== false && requiresFormal && informalPronounPattern.test(text)) {
      reject("FORBIDDEN_PHRASE", "soft", "используй уважительное обращение на вы");
      continue;
    }
    if (input.enforcePromptRules !== false && emojiPattern.test(text) && !emojiPattern.test(input.draftNotes)) {
      reject("FORBIDDEN_PHRASE", "soft", "убери эмодзи, которых не было в черновике");
      continue;
    }

    variants.push({ id: type, label: labels[type], text });
  }

  for (const type of variantTypes) {
    if (!variants.some((variant) => variant.id === type) && !issues.some((issue) => issue.type === type)) {
      issues.push({
        type,
        code: "MISSING_VARIANTS",
        severity: "hard",
        message: `${type}: добавь вариант этого типа`
      });
    }
  }

  if (variants.length === 3 && input.enforcePromptRules !== false) {
    const openings = variants.map((variant) => normalizeComparable(variant.text).split(" ").slice(0, 3).join(" "));
    if (new Set(openings).size === 1) {
      issues.push({
        type: "style",
        code: "DUPLICATE_OPENING",
        severity: "soft",
        message: "style: начни иначе, чтобы три варианта не имели одинаковую структуру"
      });
      return { variants: variants.filter((variant) => variant.id !== "style"), issues };
    }
  }

  return { variants, issues };
};

export const validateProviderVariants = (input: ProviderValidationInput): AiVariant[] | null => {
  const result = inspectProviderVariants(input);
  return result.variants.length === 3 && result.issues.length === 0 ? result.variants : null;
};
