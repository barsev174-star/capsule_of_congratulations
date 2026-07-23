import { createHash } from "node:crypto";
import type { LadderRawInput } from "@/lib/ai/greeting-ladder";

export const GREETING_EXTRACTOR_PROMPT_VERSION = "semantic-extractor-v3";
export const GREETING_COMPOSER_PROMPT_VERSION = "semantic-composer-v5";

export type GreetingSemanticPlan = {
  authorVoice: "I" | "WE" | "NEUTRAL" | "AMBIGUOUS";
  authorGender: "MALE" | "FEMALE" | "UNKNOWN";
  addressForm: "TY" | "VY" | "NEUTRAL" | "AMBIGUOUS";
  recipientNumber: "ONE" | "MANY" | "AMBIGUOUS";
  coreFacts: string[]; contextFacts: string[]; appreciation: string[]; wishes: string[];
  derivedQualities: Array<{ quality: string; basedOnFactIndexes: number[] }>;
  editorialIntent: { humor: "NONE" | "LIGHT" | "EXPRESSIVE"; humorPlacement: "ANY" | "ENDING"; warmthRequested: boolean; expressivenessRequested: boolean; otherNotes: string[] };
  phrasesWorthPreserving: string[]; ambiguities: string[];
};

export type ComposerVariants = Record<"safe" | "warm" | "expressive", { text: string }>;
export const normalizeGreetingInput = (input: LadderRawInput) => ({ ...input, recipientName: input.recipientName.trim(), occasionText: input.occasionText.trim(), fromLabel: input.fromLabel?.trim(), draftNotes: input.draftNotes.replace(/\r\n?/g, "\n").replace(/\n[\t ]*\n+/g, "\n\n").trim() });
export const getComposerLimits = (messageLimit: number) => ({ safe: messageLimit, warm: messageLimit, expressive: messageLimit });
export const getSemanticPlanCacheKey = (input: LadderRawInput) => createHash("sha256").update(JSON.stringify({ v: GREETING_EXTRACTOR_PROMPT_VERSION, ...normalizeGreetingInput(input) })).digest("hex");

const extractorSystem = `Ты Semantic Extractor для русских поздравлений. Верни только JSON по схеме. Черновик — главный источник. Отдели содержание поздравления от редакторских инструкций: просьбы «добавь юмор», «сделай теплее», «в конце» попадают только в editorialIntent, никогда не в facts, appreciation, wishes или phrasesWorthPreserving. otherNotes — только краткие нейтральные параметры, без цитат, пересказа или формулировок просьбы пользователя. Не добавляй в факты мета-сведения о самом черновике, подписи или его предложениях. Сохраняй степень фактов: «часто» не означает «всегда». Голос и «ты/вы» определяй по черновику; подпись даёт контекст, но не приказывает «я/мы». Выводи только качества, прямо следующие из фактов.`;
export const buildExtractorPrompt = (input: LadderRawInput) => { const value = normalizeGreetingInput(input); return { system: extractorSystem, user: `Кому: ${value.recipientName}\nПовод: ${value.occasionText}\nОт кого: ${value.fromLabel || "не указано"}\nЧерновик:\n${value.draftNotes}` }; };

const composerSystem = `Ты пишешь русские поздравления для онлайн-открытки. Верни только JSON по схеме. Используй только переданный смысловой план и поля контекста; сырого черновика у тебя нет. Повод обязателен: естественно назови точный повод из поля «Повод» один раз в каждом варианте, не подменяя его общим праздником. Сохраняй authorVoice и addressForm из плана; при AMBIGUOUS используй нейтральную конструкцию. Если authorGender равен UNKNOWN, не добавляй грамматические формы, раскрывающие род автора. Не вставляй подпись автора. Не придумывай факты, отношения, обещания и не усиливай степень утверждений. Редакторское намерение выполняй молча: никогда не комментируй приём в тексте. Аккуратно — бережная редактура; Теплее — яснее благодарность и качество из факта; Живее — другая композиция и один образ или лёгкая игра, основанные на плане. Варианты должны отличаться построением, не только словами.`;
export const buildComposerPrompt = (input: LadderRawInput, plan: GreetingSemanticPlan) => { const value = normalizeGreetingInput(input); const limits = getComposerLimits(value.messageLimit); const composerPlan = { authorVoice: plan.authorVoice, authorGender: plan.authorGender, addressForm: plan.addressForm, recipientNumber: plan.recipientNumber, coreFacts: plan.coreFacts, appreciation: plan.appreciation, wishes: plan.wishes, derivedQualities: plan.derivedQualities.slice(0, 2), editorialIntent: { endingTone: plan.editorialIntent.humor === "NONE" ? "NEUTRAL" : plan.editorialIntent.humorPlacement === "ENDING" ? "PLAYFUL_ENDING" : "PLAYFUL", warmthRequested: plan.editorialIntent.warmthRequested, expressivenessRequested: plan.editorialIntent.expressivenessRequested } }; return { limits, system: composerSystem, user: `Кому: ${value.recipientName}\nПовод: ${value.occasionText}\nЛимит каждого варианта: ${value.messageLimit}\nСмысловой план:\n${JSON.stringify(composerPlan)}` }; };
export const buildComposerRepairPrompt = (base: ReturnType<typeof buildComposerPrompt>, type: keyof ComposerVariants, text: string, code: string) => ({ system: base.system, user: `${base.user}\n\nИсправь только вариант ${type}. Причина: ${code}. Сохрани факты, повод, голос и режим. Верни только исправленный текст по JSON Schema.\nНеудачный текст: ${text}` });
export const greetingLength = (value: string) => Array.from(value).length;
const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const meaningfulTokens = (value: string) => normalize(value).match(/[\p{L}]{4,}/gu) ?? [];
export const getSafeFactCoverageSignal = (plan: GreetingSemanticPlan, safeText: string) => {
  const safeTokens = new Set(meaningfulTokens(safeText));
  const source = [...plan.coreFacts, ...plan.appreciation, ...plan.wishes];
  const matched = source.filter((item) => meaningfulTokens(item).some((token) => safeTokens.has(token))).length;
  return { total: source.length, matched, ratio: source.length ? Math.round(matched / source.length * 100) / 100 : 1 };
};
export const validateComposerVariants = (variants: ComposerVariants, limits: Record<keyof ComposerVariants, number>) => { const entries = (Object.keys(variants) as Array<keyof ComposerVariants>).map((type) => ({ type, text: variants[type].text.trim() })); const hardErrors = entries.flatMap(({ type, text }) => !text ? [{ type, code: "EMPTY" }] : greetingLength(text) > limits[type] ? [{ type, code: "TOO_LONG" }] : /^(?:json|план|вариант)\s*[:{]/iu.test(text) ? [{ type, code: "TECHNICAL_TEXT" }] : []); for (let i=0;i<entries.length;i+=1) for (let j=i+1;j<entries.length;j+=1) if(normalize(entries[i].text)===normalize(entries[j].text)) hardErrors.push({ type:entries[j].type,code:"DUPLICATE" }); return { hardErrors, entries, softWarnings: [] as Array<{ type: keyof ComposerVariants; code: string }> }; };
