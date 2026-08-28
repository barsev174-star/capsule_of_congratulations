import { createHash } from "node:crypto";
import type { LadderRawInput } from "@/lib/ai/greeting-ladder";
import type { AiJoinAction } from "@/lib/ai/types";

export const GREETING_EXTRACTOR_PROMPT_VERSION = "semantic-extractor-v3";
export const GREETING_COMPOSER_PROMPT_VERSION = "semantic-composer-v5";
export const YANDEX_GREETING_EXTRACTOR_PROMPT_VERSION = "yandex-semantic-extractor-v4";
export const YANDEX_GREETING_COMPOSER_PROMPT_VERSION = "yandex-semantic-composer-v5";
export const YANDEX_PLANNED_GREETING_COMPOSER_PROMPT_VERSION = "yandex-semantic-composer-v6-planned";

export type GreetingPromptProfile = "default" | "yandex";

export const getGreetingPromptProfile = (): GreetingPromptProfile => {
  const explicitProfile = process.env.AI_GREETING_PROMPT_PROFILE?.trim().toLocaleLowerCase("ru-RU");
  if (explicitProfile === "yandex") return "yandex";
  if (explicitProfile === "default") return "default";

  const runtimeProvider = process.env.AI_GREETING_PROVIDER ?? process.env.AI_PROVIDER;
  if (runtimeProvider === "routerai") return "yandex";

  const extractorModel = process.env.YANDEX_GREETING_EXTRACTOR_MODEL ?? "";
  const composerModel = process.env.YANDEX_GREETING_COMPOSER_MODEL ?? "";
  return extractorModel.toLocaleLowerCase("ru-RU").includes("yandex")
    && composerModel.toLocaleLowerCase("ru-RU").includes("yandex")
    ? "yandex"
    : "default";
};

export const isYandexComposerPlanningEnabled = () => process.env.YANDEX_COMPOSER_PLANNING === "1";
export const getGreetingPromptVersions = (profile: GreetingPromptProfile = getGreetingPromptProfile()) => profile === "yandex"
  ? { extractor: YANDEX_GREETING_EXTRACTOR_PROMPT_VERSION, composer: isYandexComposerPlanningEnabled() ? YANDEX_PLANNED_GREETING_COMPOSER_PROMPT_VERSION : YANDEX_GREETING_COMPOSER_PROMPT_VERSION }
  : { extractor: GREETING_EXTRACTOR_PROMPT_VERSION, composer: GREETING_COMPOSER_PROMPT_VERSION };

export type GreetingSemanticPlan = {
  authorVoice: "I" | "WE" | "NEUTRAL" | "AMBIGUOUS";
  authorGender: "MALE" | "FEMALE" | "UNKNOWN";
  addressForm: "TY" | "VY" | "NEUTRAL" | "AMBIGUOUS";
  recipientNumber: "ONE" | "MANY" | "AMBIGUOUS";
  coreFacts: Array<string | { id: string; text: string; mustPreserve: boolean }>;
  contextFacts: string[]; appreciation: string[]; wishes: string[];
  derivedQualities: Array<{ quality: string; basedOnFactIndexes: number[] }>;
  editorialIntent: { humor: "NONE" | "LIGHT" | "EXPRESSIVE"; humorPlacement: "ANY" | "ENDING"; warmthRequested: boolean; expressivenessRequested: boolean; otherNotes: string[] };
  phrasesWorthPreserving: string[]; ambiguities: string[];
};

export type GreetingCoreFact = { id: string; text: string; mustPreserve: boolean };
export const normalizeGreetingCoreFacts = (facts: GreetingSemanticPlan["coreFacts"]): GreetingCoreFact[] => facts.map((fact, index) => typeof fact === "string"
  ? { id: `f${index + 1}`, text: fact, mustPreserve: true }
  : { id: fact.id || `f${index + 1}`, text: fact.text, mustPreserve: fact.mustPreserve });

export type ComposerVariants = Record<"safe" | "warm" | "expressive", { text: string }>;
export type ComposerCompositionPlans = {
  safe: string[];
  warm: string[];
  expressive: string[];
  expressiveHumorFactId: string | null;
};
export type ComposerPlanRequirements = {
  validIds: string[];
  requiredIds: string[];
  factIds: string[];
  humorRequested: boolean;
};
export type SingleComposerPrompt = {
  system: string;
  user: string;
  limit: number;
  action: AiJoinAction;
};
export const normalizeGreetingInput = (input: LadderRawInput) => ({ ...input, recipientName: input.recipientName.trim(), occasionText: input.occasionText.trim(), fromLabel: input.fromLabel?.trim(), draftNotes: input.draftNotes.replace(/\r\n?/g, "\n").replace(/\n[\t ]*\n+/g, "\n\n").trim() });
export const getComposerLimits = (messageLimit: number) => ({ safe: messageLimit, warm: messageLimit, expressive: messageLimit });
const hasStandalone = (value: string, alternatives: string) => new RegExp(`(?:^|[^\\p{L}])(?:${alternatives})(?=$|[^\\p{L}])`, "iu").test(value);
export const stabilizeGreetingSemanticPlan = (input: LadderRawInput, plan: GreetingSemanticPlan): GreetingSemanticPlan => {
  const draft = input.draftNotes;
  const hasSingularAuthor = hasStandalone(draft, "я|мне|меня|мной|желаю|благодарю|поздравляю");
  const hasPluralAuthor = hasStandalone(draft, "мы|нам|нас|нами|желаем|благодарим|поздравляем");
  const authorVoice = hasSingularAuthor && hasPluralAuthor ? "AMBIGUOUS" : hasSingularAuthor ? "I" : hasPluralAuthor ? "WE" : plan.authorVoice;
  const hasTy = hasStandalone(draft, "ты|тебе|тебя|тобой|тво[йяеёим][а-яё]*");
  const hasVy = hasStandalone(draft, "вы|вам|вас|вами|ваш[а-яё]*");
  const addressForm = plan.recipientNumber === "MANY" ? "VY" : hasTy && hasVy ? "AMBIGUOUS" : hasTy ? "TY" : hasVy ? "VY" : plan.addressForm;
  const hasMaleAuthor = hasStandalone(draft, "благодарен|рад|счастлив|уверен|хотел|решил");
  const hasFemaleAuthor = hasStandalone(draft, "благодарна|рада|счастлива|уверена|хотела|решила");
  const authorGender = hasMaleAuthor === hasFemaleAuthor ? "UNKNOWN" : hasMaleAuthor ? "MALE" : "FEMALE";
  return { ...plan, authorVoice, addressForm, authorGender };
};
const capitalizeSentence = (value: string) => value ? value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1) : value;
const neutralizeAuthorSentence = (sentence: string) => {
  const trimmed = sentence.trim();
  const thanked = trimmed.replace(/^(?:(?:я|мы)\s+)?(?:благодарю|благодарим)\s+/iu, "Спасибо ");
  if (thanked !== trimmed) return thanked;
  const valued = trimmed.replace(/^(?:(?:я|мы)\s+)?(?:ценю|ценим|отмечаю|отмечаем)\s+/iu, "Спасибо за ");
  if (valued !== trimmed) return valued;
  const wished = trimmed.replace(/^(?:от\s+всей\s+души\s+)?(?:(?:я|мы)\s+)?(?:желаю|желаем)\s+(?:(?:вам|тебе)\s+)?/iu, "");
  return wished !== trimmed ? capitalizeSentence(wished) : trimmed;
};
export const stabilizeComposerVariants = (variants: ComposerVariants, plan: GreetingSemanticPlan): ComposerVariants => {
  if (plan.authorVoice !== "NEUTRAL" && plan.authorVoice !== "AMBIGUOUS") return variants;
  return Object.fromEntries(Object.entries(variants).map(([type, variant]) => [type, {
    text: variant.text.split(/(?<=[.!?])\s+/u).map(neutralizeAuthorSentence).join(" ")
  }])) as ComposerVariants;
};
export const getSemanticPlanCacheKey = (input: LadderRawInput, profile: GreetingPromptProfile = getGreetingPromptProfile()) => {
  const version = getGreetingPromptVersions(profile).extractor;
  return createHash("sha256").update(JSON.stringify({ v: version, profile, ...normalizeGreetingInput(input) })).digest("hex");
};

const extractorSystem = `Ты Semantic Extractor для русских поздравлений. Верни только JSON по схеме. Черновик — главный источник. Отдели содержание поздравления от редакторских инструкций: просьбы «добавь юмор», «сделай теплее», «в конце» попадают только в editorialIntent, никогда не в facts, appreciation, wishes или phrasesWorthPreserving. otherNotes — только краткие нейтральные параметры, без цитат, пересказа или формулировок просьбы пользователя. Не добавляй в факты мета-сведения о самом черновике, подписи или его предложениях. Сохраняй степень фактов: «часто» не означает «всегда». Голос и «ты/вы» определяй по черновику; подпись даёт контекст, но не приказывает «я/мы». Выводи только качества, прямо следующие из фактов.`;
const yandexExtractorRules = `

Выполни классификацию буквально, без творческой интерпретации.
Порядок проверки перед ответом:
1. recipientNumber определяется по полю «Кому» и адресатам в черновике. «Сосед», «мама», одно имя — ONE. «Родители», «выпускники», два имени через «и», семья или группа — MANY. Форма «поздравляем» описывает автора и не делает одного адресата группой.
2. authorVoice определяется только по словам автора в черновике: «я», «мне», «желаю», «благодарю» — I; «мы», «нас», «желаем», «благодарим», «поздравляем» — WE. Если одновременно есть явные признаки I и WE — AMBIGUOUS. Если признаков нет — NEUTRAL. Не определяй голос по подписи.
3. addressForm описывает обращение к получателю: «ты/тебе/тебя/твой» — TY; «вы/вам/вас/ваш» — VY. Для нескольких адресатов форма всегда VY. Не путай addressForm с authorVoice.
4. Просьба о юморе — editorialIntent.humor: «лёгкий/немного» означает LIGHT; явная просьба сделать очень смешно — EXPRESSIVE. Сам факт смешного эпизода без просьбы не означает юмор.

Выделяй coreFacts атомарно: один срок, эпизод, поступок, действие или индивидуальная деталь — один факт. Не объединяй разные конкретные детали, если одна из них может потеряться при пересказе.
Для каждого coreFact укажи id по порядку: f1, f2, f3 и далее. mustPreserve=true ставь для конкретного срока, числа, эпизода, действия, помощи, привычки, совместного опыта или другой детали, без которой текст станет менее персональным. Общая мысль без конкретики может иметь mustPreserve=false.
authorGender относится только к автору. Ставь MALE или FEMALE лишь при явной грамматической форме автора в черновике, например «я благодарен/благодарна», «я хотел/хотела». Не определяй пол автора по имени, получателю, подписи или теме; без явной формы ставь UNKNOWN.`;
export const buildExtractorPrompt = (input: LadderRawInput, profile: GreetingPromptProfile = getGreetingPromptProfile()) => {
  const value = normalizeGreetingInput(input);
  return {
    system: profile === "yandex" ? `${extractorSystem}${yandexExtractorRules}` : extractorSystem,
    user: `Кому: ${value.recipientName}\nПовод: ${value.occasionText}\nОт кого: ${value.fromLabel || "не указано"}\nЧерновик:\n${value.draftNotes}`
  };
};

const composerSystem = `Ты пишешь русский текст для онлайн-открытки к указанному поводу. Верни только JSON по схеме. Используй только переданный смысловой план и поля контекста; сырого черновика у тебя нет. Повод обязателен: естественно назови точный повод из поля «Повод» один раз в каждом варианте, не подменяя его другим событием. Не считай любой повод праздником: для нейтрального, делового, прощального или чувствительного события выбирай уместный сдержанный тон; юмор используй только по явной просьбе. Сохраняй authorVoice и addressForm из плана; при AMBIGUOUS используй нейтральную конструкцию. Если authorGender равен UNKNOWN, не добавляй грамматические формы, раскрывающие род автора. Не вставляй подпись автора. Не придумывай факты, отношения, обещания и не усиливай степень утверждений. Редакторское намерение выполняй молча: никогда не комментируй приём в тексте. Аккуратно — бережная редактура; Теплее — яснее благодарность и качество из факта; Живее — другая композиция и один образ или лёгкая игра, основанные на плане. Варианты должны отличаться построением, не только словами.`;
const yandexComposerSystem = `Ты редактируешь русский текст для онлайн-открытки по переданному смысловому плану и создаёшь три действительно разные версии. Верни только JSON по схеме. Сырого черновика у тебя нет.

Факты важнее красивых формулировок. Не придумывай события, отношения, качества, обещания или пожелания. Каждый coreFact с mustPreserve=true естественно передай в каждом варианте: можно сокращать, объединять в предложение и перефразировать, но нельзя опускать или усиливать. Не выводи качества самостоятельно. Пожелания автора не заменяй более общими или торжественными.

Каждый вариант должен быть ясно связан с поводом. Поле occasionMode определяет способ: EXPLICIT_FORMULA — естественно назови повод один раз; CONTEXTUAL — передай ситуацию через факты и пожелания, не повторяй техническое или канцелярское название события механически. Не считай нейтральное, деловое, прощальное или чувствительное событие праздником.

Персональность важнее торжественности. Предпочитай конкретные действия, эпизоды и пожелания из плана универсальным красивым фразам. Каждое содержательное предложение должно передавать факт, благодарность или пожелание из плана либо естественно связывать их. Если фраза без изменений подошла бы почти любому человеку и не передаёт пожелание автора, убери её или свяжи с конкретной деталью.

SAFE — бережная редактура. По возможности сохраняй порядок основных мыслей. Исправляй язык, связность и повторы, не добавляя образов, выводов и новых эмоциональных акцентов.
WARM — более личная версия. Не копируй композицию SAFE: начни с наиболее личной благодарности или конкретной детали, затем естественно перейди к пожеланию. Показывай отношение порядком мыслей и глаголами, а не усилителями. Не превращай поступок в новый вывод о статусе, исключительности, влиянии или общей ценности человека.
EXPRESSIVE — самая живая версия. Не копируй начало и порядок SAFE или WARM. Начни с характерной конкретной детали или измени порядок фактов. Если humor=NONE и expressivenessRequested=false, живость создаётся только композицией, ритмом и близким пересказом: не добавляй образ, оценку или итоговый вывод. Если humor не NONE, не повторяй готовую смешную деталь буквально, а слегка обыграй её через контраст или неожиданное продолжение без новой истории и новых фактов. При humorPlacement ENDING юмористический поворот завершает текст.

Три варианта не должны иметь одинаковое первое содержательное предложение и одинаковый порядок основных смысловых блоков.

Сохраняй грамматику плана: I = «поздравляю/желаю/благодарю»; WE = «поздравляем/желаем/благодарим»; NEUTRAL или AMBIGUOUS = никаких глаголов и местоимений первого лица. TY допускает только «ты/тебе/тебя/твой»; VY — только «вы/вам/вас/ваш»; при MANY всё согласуется во множественном числе. При UNKNOWN не используй формы, раскрывающие пол автора. Не вставляй подпись автора и не комментируй редакторский приём.

Пожелания передавай максимально близко к словам плана: сохраняй названные существительные и смысловые связи, не добавляй к ним усилительные прилагательные, превосходную степень или новые пожелания.

Если длины не хватает, сначала убирай вводные формулы, усилители и необязательные мысли. Обязательные факты и все пожелания автора имеют приоритет. Перед JSON молча проверь: все mustPreserve-факты и wishes сохранены; пожелания не заменены и не расширены; повод понятен; лицо автора и ты/вы верны; версии различаются не только синонимами.`;

const yandexPlannedComposerSystem = `Ты редактируешь русский текст для онлайн-открытки по переданному смысловому плану и создаёшь три версии. Верни только JSON по схеме: сначала plans сразу для всех трёх вариантов, затем texts. Сырого черновика у тебя нет.

Факты важнее красивых формулировок. Не придумывай события, отношения, качества, обещания или пожелания. Каждый coreFact с mustPreserve=true естественно передай в каждом варианте: можно сокращать, объединять в предложение и перефразировать, но нельзя опускать или усиливать. Не выводи качества самостоятельно. Пожелания автора не заменяй более общими или торжественными.

Каждый вариант должен быть ясно связан с поводом. Поле occasionMode определяет способ: EXPLICIT_FORMULA — естественно назови повод один раз; CONTEXTUAL — передай ситуацию через факты и пожелания, не повторяй техническое или канцелярское название события механически. Не считай нейтральное, деловое, прощальное или чувствительное событие праздником.

Перед написанием texts сначала составь plans для всех трёх вариантов. Каждый plan — последовательность ID occasion, coreFacts и wishes в порядке раскрытия их смысла. Используй только переданные ID. Plan описывает весь содержательный материал текста, а не список оснований для дополнительных мыслей. Текст может связывать соседние элементы, объединять их и естественно перефразировать, но не может добавлять самостоятельный смысловой тезис, которого нет в этих элементах. Поле appreciation подсказывает, какие факты уместно выразить как благодарность, но не является отдельным тезисом.

Каждый plan обязан содержать все coreFacts с mustPreserve=true и все wishes. При occasion.mode=EXPLICIT_FORMULA каждый plan также содержит o1. При CONTEXTUAL повод является только контекстом: не включай o1 в plans и не вставляй техническое название события в текст. Сначала полностью сформируй plans.safe, plans.warm и plans.expressive, только затем пиши все три texts строго по соответствующим plans. Не делай выводов о значимости человека, его роли, ценности, влиянии или отношении окружающих, если такой вывод сам не передан отдельным элементом плана. Факт является материалом для пересказа, а не основанием для новой оценки.

Персональность важнее торжественности. Предпочитай конкретные действия, эпизоды и пожелания из плана универсальным красивым фразам. Каждое содержательное предложение должно передавать элемент соответствующего plan либо естественно связывать соседние элементы.

SAFE — бережная редактура. Plan сохраняет наиболее прямой и естественный порядок исходных мыслей. Исправляй язык, связность и повторы, не добавляя образов, выводов и новых эмоциональных акцентов.
WARM — более личная версия. При наличии нескольких независимых элементов измени фокус и порядок: сначала наиболее личная благодарность или конкретная деталь, затем пожелание. Не создавай теплоту дополнительной похвалой или выводом.
EXPRESSIVE — самая живая версия. Если материала достаточно, используй другой порядок. Начало или смысловой поворот строится вокруг характерного конкретного факта, но факт не получает новой оценки. Если humor=NONE и expressivenessRequested=false, живость создаётся только композицией, ритмом и близким пересказом. Если humor не NONE, запиши ID опорного факта в expressiveHumorFactId и слегка обыграй только его через контраст или неожиданное продолжение без новой истории и новых свойств человека. При humorPlacement ENDING этот поворот завершает текст. Без запроса юмора expressiveHumorFactId должен быть null.

Если смыслового материала мало для трёх разных порядков, не создавай искусственные различия и новые мысли: различай варианты синтаксисом, началом и способом соединения тех же смыслов.

Сохраняй грамматику плана: I = «поздравляю/желаю/благодарю»; WE = «поздравляем/желаем/благодарим»; NEUTRAL или AMBIGUOUS = никаких глаголов и местоимений первого лица. TY допускает только «ты/тебе/тебя/твой»; VY — только «вы/вам/вас/ваш»; при MANY всё согласуется во множественном числе. При UNKNOWN не используй формы, раскрывающие пол автора. Не вставляй подпись автора и не комментируй редакторский приём.

Пожелания передавай максимально близко к словам плана: сохраняй названные существительные и смысловые связи, не добавляй к ним усилительные прилагательные, превосходную степень или новые пожелания.

Если длины не хватает, сначала убирай вводные формулы, усилители и необязательные мысли. Обязательные факты и все пожелания автора имеют приоритет. Перед JSON молча проверь: все mustPreserve-факты и wishes сохранены; пожелания не заменены и не расширены; повод понятен; лицо автора и ты/вы верны; версии различаются не только синонимами.`;

const explicitOccasionPattern = /(?:д(?:ень|н[её]м)\s+(?:рождени|свадьб|учител|педагог|матер|семь|защитник|побед)|свадьб|юбиле|годовщ|нов(?:ый|ым)\s+год|выпускн|повышени|8\s*март|23\s*феврал)/iu;
export const getOccasionExpressionMode = (occasionText: string): "EXPLICIT_FORMULA" | "CONTEXTUAL" => explicitOccasionPattern.test(occasionText)
  ? "EXPLICIT_FORMULA"
  : "CONTEXTUAL";
export const buildComposerPrompt = (input: LadderRawInput, plan: GreetingSemanticPlan, profile: GreetingPromptProfile = getGreetingPromptProfile()) => {
  const value = normalizeGreetingInput(input);
  const limits = getComposerLimits(value.messageLimit);
  const planning = profile === "yandex" && isYandexComposerPlanningEnabled();
  const targetLength = profile === "yandex" ? Math.max(80, Math.floor(value.messageLimit * 0.82)) : value.messageLimit;
  const normalizedFacts = normalizeGreetingCoreFacts(plan.coreFacts);
  const identifiedWishes = plan.wishes.map((text, index) => ({ id: `w${index + 1}`, text }));
  const occasion = { id: "o1", text: value.occasionText, mode: getOccasionExpressionMode(value.occasionText) };
  const occasionPlanIds = occasion.mode === "EXPLICIT_FORMULA" ? [occasion.id] : [];
  const basePlan = {
    authorVoice: plan.authorVoice,
    authorGender: plan.authorGender,
    addressForm: plan.addressForm,
    recipientNumber: plan.recipientNumber,
    coreFacts: profile === "yandex" ? normalizedFacts : plan.coreFacts,
    appreciation: plan.appreciation,
    wishes: planning ? identifiedWishes : plan.wishes,
    derivedQualities: plan.derivedQualities.slice(0, 2)
  };
  const composerPlan = profile === "yandex"
    ? { ...basePlan, derivedQualities: undefined, ...(planning ? { occasion } : { occasionMode: occasion.mode }), editorialIntent: {
      humor: plan.editorialIntent.humor,
      humorPlacement: plan.editorialIntent.humorPlacement,
      warmthRequested: plan.editorialIntent.warmthRequested,
      expressivenessRequested: plan.editorialIntent.expressivenessRequested
    } }
    : { ...basePlan, editorialIntent: {
      endingTone: plan.editorialIntent.humor === "NONE" ? "NEUTRAL" : plan.editorialIntent.humorPlacement === "ENDING" ? "PLAYFUL_ENDING" : "PLAYFUL",
      warmthRequested: plan.editorialIntent.warmthRequested,
      expressivenessRequested: plan.editorialIntent.expressivenessRequested
    } };
  const lengthInstruction = profile === "yandex"
    ? `Жёсткий максимум каждого варианта: ${value.messageLimit} символов. Целевая длина: не более ${targetLength} символов.`
    : `Лимит каждого варианта: ${value.messageLimit}`;
  return {
    limits,
    planning,
    planRequirements: planning ? {
      validIds: [...occasionPlanIds, ...normalizedFacts.map((fact) => fact.id), ...identifiedWishes.map((wish) => wish.id)],
      requiredIds: [...occasionPlanIds, ...normalizedFacts.filter((fact) => fact.mustPreserve).map((fact) => fact.id), ...identifiedWishes.map((wish) => wish.id)],
      factIds: normalizedFacts.map((fact) => fact.id),
      humorRequested: plan.editorialIntent.humor !== "NONE"
    } satisfies ComposerPlanRequirements : undefined,
    system: profile === "yandex" ? planning ? yandexPlannedComposerSystem : yandexComposerSystem : composerSystem,
    user: `Кому: ${value.recipientName}\nПовод: ${value.occasionText}\n${lengthInstruction}\nСмысловой план:\n${JSON.stringify(composerPlan)}`
  };
};

const singleComposerSystem = `Ты редактируешь русский текст для онлайн-открытки и возвращаешь один готовый вариант. Верни только JSON по схеме с полем text. Сырой черновик доступен только смысловому анализатору; опирайся на переданный смысловой план.

Факты важнее красивых формулировок. Сохраняй все coreFacts с mustPreserve=true, appreciation и wishes. Не придумывай реальные события, отношения, поступки, обещания или качества человека и не усиливай степень утверждений: «часто» не означает «всегда». Пожелания передавай близко к плану, не заменяя и не расширяя их.

Текст должен быть связан с поводом. Для EXPLICIT_FORMULA естественно назови повод один раз. Для CONTEXTUAL передай ситуацию через факты и пожелания, не вставляя техническое название события. Не называй нейтральное, деловое, прощальное или чувствительное событие праздником.

Персональность создаётся конкретными деталями плана, а не универсальными похвалами и торжественными фразами. Не добавляй фразы, которые без изменений подошли бы почти любому человеку, если они не передают пожелание автора.

Сохраняй грамматику плана: I = первое лицо единственного числа; WE = первое лицо множественного числа; NEUTRAL или AMBIGUOUS = без глаголов и местоимений первого лица. TY допускает только «ты/тебе/тебя/твой»; VY — только «вы/вам/вас/ваш»; при MANY всё согласуется во множественном числе. При UNKNOWN не используй формы, раскрывающие пол автора. Не вставляй подпись автора и не объясняй редакторский приём.

Если длины не хватает, сначала убирай вводные формулы и общие слова. Обязательные факты и пожелания имеют приоритет. Перед JSON молча проверь факты, пожелания, повод, лицо автора, ты/вы и длину.`;

const singleActionInstructions: Record<AiJoinAction, string> = {
  initial: "Собери основной текст максимально близко к смыслу и порядку исходных мыслей. Исправь язык, связность и повторы. Не добавляй образов, выводов и новых эмоциональных акцентов.",
  warmer: "Сделай переданный готовый текст теплее за счёт более личного порядка мыслей, естественной благодарности и мягких глаголов. Не добавляй фактов, качеств, образов, усилителей и новых пожеланий.",
  creative: "Предложи более творческую подачу с заметно иной композицией и ритмом. Разрешается добавить не более одной новой образной или игровой детали, основанной на конкретном факте или пожелании плана. Она не должна звучать как новое реальное событие, биографический факт, отношение или качество человека. Остальные смыслы не расширяй.",
  alternative: "Предложи другой естественный вариант из тех же смыслов: измени начало, порядок или способ соединения мыслей. Не добавляй новых фактов, образов, качеств и пожеланий.",
  expand: "Сделай переданный готовый текст более связным и немного подробнее раскрой уже названные мысли. Не добавляй новых фактов, событий, качеств, отношений или пожеланий.",
  shorten: "Сократи переданный готовый текст заметно, убирая вводные слова, повторы и необязательные связки. Сохрани все обязательные факты, пожелания, повод и естественность речи."
};

export const buildSingleComposerPrompt = (
  input: LadderRawInput,
  plan: GreetingSemanticPlan,
  action: AiJoinAction,
  sourceText?: string,
  profile: GreetingPromptProfile = "yandex"
): SingleComposerPrompt => {
  const base = buildComposerPrompt(input, plan, profile);
  const sourceLength = Array.from(sourceText ?? "").length;
  const targetLength = action === "shorten" && sourceLength > 0
    ? Math.max(80, Math.min(input.messageLimit, Math.floor(sourceLength * 0.72)))
    : action === "expand" && sourceLength > 0
      ? Math.min(input.messageLimit, Math.max(sourceLength + 40, Math.floor(sourceLength * 1.45)))
      : Math.max(80, Math.floor(input.messageLimit * 0.82));
  const sourceBlock = action === "initial"
    ? ""
    : `\n\nТекущий готовый текст — ориентир для редактирования, но не источник новых фактов:\n${sourceText ?? ""}`;

  return {
    action,
    limit: input.messageLimit,
    system: `${singleComposerSystem}\n\nЗадача этого запроса: ${singleActionInstructions[action]}`,
    user: `${base.user}\nЦелевая длина одного текста: не более ${targetLength} символов.${sourceBlock}`
  };
};

export const buildSingleComposerRepairPrompt = (
  base: SingleComposerPrompt,
  text: string,
  code: string,
  detail?: string
) => ({
  system: `${base.system}\n\nИсправь только указанное объективное нарушение. Не меняй задачу и не добавляй новый смысл. Верни только JSON с полем text.`,
  user: `${base.user}\n\nПричина исправления: ${code}.${detail ? ` ${detail}` : ""} ${repairInstructions[code] ?? "Устрани указанное нарушение."}\nНеудачный текст: ${text}`
});
export const buildComposerReviewPrompt = (
  base: ReturnType<typeof buildComposerPrompt>,
  variants: ComposerVariants
) => ({
  limits: base.limits,
  planning: base.planning,
  planRequirements: base.planRequirements,
  system: `${base.system}\n\nРежим финального редактора. Проверь уже написанные варианты, а не сочиняй содержание заново. Для каждого содержательного предложения молча найди опору в смысловом плане: повод, coreFact, appreciation, wish или разрешённый humor. Если опоры нет, удали предложение или замени его близким пересказом данных плана. Убирай как класс отдельные общие похвалы, усиления, выводы, лозунги и метафоры, которые модель добавила от себя. Не заменяй одно пожелание другим и не усиливай частоту, масштаб или ценность. Сохрани естественный тон, различие трёх вариантов, грамматику и лимиты. Если вариант уже соответствует правилам, оставь его без изменений.`,
  user: `${base.user}\n\nПроверь и при необходимости исправь эти варианты:\n${JSON.stringify(variants)}`
});
const repairInstructions: Record<string, string> = {
  TOO_LONG: "Сократи текст минимум на 20%, убирая общие слова, но сохраняя повод и основные факты.",
  AUTHOR_VOICE_MISMATCH: "Исправь грамматическое лицо строго по authorVoice. Для NEUTRAL или AMBIGUOUS полностью убери формы первого лица: не используй «поздравляю/поздравляем», «желаю/желаем», «благодарю/благодарим», «ценю/ценим», «отмечаю/отмечаем». Перестрой через безличные «Спасибо за…», «Здоровья…», «Пусть…».",
  AUTHOR_GENDER_MISMATCH: "Полностью убери формы, раскрывающие пол автора. Вместо «благодарен/благодарна» используй нейтральное «спасибо» или глагол по authorVoice.",
  ADDRESS_FORM_MISMATCH: "Исправь только форму обращения строго по addressForm и recipientNumber.",
  OCCASION_MISSING: "Естественно назови переданный повод, не заменяя его другим событием.",
  DUPLICATE: "Перестрой композицию варианта, сохранив тот же смысл.",
  MISSING_REQUIRED_FACT: "Добавь все перечисленные обязательные факты естественно, не удаляя остальные обязательные факты и пожелания. Сократи общие и вводные слова, если не хватает места.",
  MISSING_WISH: "Верни все перечисленные пожелания автора максимально близко к их исходному смыслу. Не заменяй их более общими пожеланиями и не удаляй факты.",
  NOT_SHORTER: "Сделай результат заметно короче текущего текста. Удали вводные слова, повторы и необязательные связки, сохранив обязательные факты и пожелания."
};
export const buildComposerRepairPrompt = (base: ReturnType<typeof buildComposerPrompt>, type: keyof ComposerVariants, text: string, code: string, detail?: string) => ({
  system: base.planning ? `${base.system}\n\nРежим точечного исправления имеет приоритет над требованием сформировать plans и три texts. Уже спланированный вариант исправляется отдельно: не создавай и не возвращай композиционные plans. Верни только объект с полем text по отдельной JSON Schema.` : base.system,
  user: `${base.user}\n\nИсправь только вариант ${type}. Причина: ${code}.${detail ? ` ${detail}` : ""} ${repairInstructions[code] ?? "Устрани указанное нарушение."} Сохрани факты, повод, голос и режим. Верни только исправленный текст по JSON Schema.\nНеудачный текст: ${text}`
});
export const greetingLength = (value: string) => Array.from(value).length;
const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const meaningfulTokens = (value: string) => normalize(value).match(/[\p{L}]{4,}/gu) ?? [];
const factText = (fact: GreetingSemanticPlan["coreFacts"][number]) => typeof fact === "string" ? fact : fact.text;
const factStems = (value: string) => meaningfulTokens(value).map((token) => token.slice(0, 4));
const textContainsFactSignal = (text: string, fact: string) => {
  const stems = factStems(fact);
  const normalizedText = normalize(text);
  return stems.length === 0 || stems.some((stem) => normalizedText.includes(stem));
};
const textContainsWishSignal = (text: string, wish: string) => {
  const stems = factStems(wish);
  if (stems.length === 0) return true;
  const normalizedText = normalize(text);
  const matched = stems.filter((stem) => normalizedText.includes(stem)).length;
  return matched >= (stems.length <= 2 ? 1 : Math.min(2, Math.ceil(stems.length * 0.34)));
};
const hasAuthorVoiceMismatch = (text: string, voice: GreetingSemanticPlan["authorVoice"]) => {
  if (voice === "I") return /(?:^|[^\p{L}])(?:поздравляем|желаем|благодарим|ценим|отмечаем)(?=$|[^\p{L}])/iu.test(text);
  if (voice === "WE") return /(?:^|[^\p{L}])(?:поздравляю|желаю|благодарю|ценю|отмечаю)(?=$|[^\p{L}])/iu.test(text);
  return /(?:^|[^\p{L}])(?:поздравляю|желаю|благодарю|ценю|отмечаю|поздравляем|желаем|благодарим|ценим|отмечаем)(?=$|[^\p{L}])/iu.test(text);
};
const hasAddressFormMismatch = (text: string, form: GreetingSemanticPlan["addressForm"], number: GreetingSemanticPlan["recipientNumber"]) => {
  if (form === "TY") return /(?:^|[^\p{L}])(?:вы|вам|вас|ваш[а-яё]*)(?=$|[^\p{L}])/iu.test(text);
  if (form === "VY" || number === "MANY") return /(?:^|[^\p{L}])(?:ты|тебе|тебя|тобой|тво[йяеёим][а-яё]*)(?=$|[^\p{L}])/iu.test(text);
  return false;
};
const hasUnknownAuthorGenderMismatch = (text: string, gender: GreetingSemanticPlan["authorGender"]) => gender === "UNKNOWN"
  && /(?:^|[.!?]\s*)(?:я\s+)?(?:очень\s+|искренне\s+|особенно\s+)?(?:благодарен|благодарна|рад|рада)(?=$|[^\p{L}])/iu.test(text);
const isOccasionMissing = (text: string, occasionText: string) => {
  const stems = (normalize(occasionText).match(/[\p{L}]{4,}/gu) ?? []).map((token) => token.slice(0, 5));
  if (stems.length === 0) return false;
  const normalizedText = normalize(text);
  const matched = stems.filter((stem) => normalizedText.includes(stem)).length;
  return matched < Math.max(1, Math.ceil(stems.length * 0.5));
};
export const getSafeFactCoverageSignal = (plan: GreetingSemanticPlan, safeText: string) => {
  const safeTokens = new Set(meaningfulTokens(safeText));
  const source = [...plan.coreFacts.map(factText), ...plan.appreciation, ...plan.wishes];
  const matched = source.filter((item) => meaningfulTokens(item).some((token) => safeTokens.has(token))).length;
  return { total: source.length, matched, ratio: source.length ? Math.round(matched / source.length * 100) / 100 : 1 };
};
type ComposerValidationIssue = { type: keyof ComposerVariants; code: string; detail?: string };
export const validateSingleComposerText = (
  text: string,
  limit: number,
  plan?: GreetingSemanticPlan,
  occasionText?: string,
  type: keyof ComposerVariants = "safe",
  profile: GreetingPromptProfile = getGreetingPromptProfile()
) => {
  const value = text.trim();
  const hardErrors: ComposerValidationIssue[] = !value
    ? [{ type, code: "EMPTY" }]
    : greetingLength(value) > limit
      ? [{ type, code: "TOO_LONG" }]
      : /^(?:json|план|вариант)\s*[:{]/iu.test(value)
        ? [{ type, code: "TECHNICAL_TEXT" }]
        : [];

  if (plan && value) {
    if (hasAuthorVoiceMismatch(value, plan.authorVoice)) hardErrors.push({ type, code: "AUTHOR_VOICE_MISMATCH" });
    if (hasUnknownAuthorGenderMismatch(value, plan.authorGender)) hardErrors.push({ type, code: "AUTHOR_GENDER_MISMATCH" });
    if (hasAddressFormMismatch(value, plan.addressForm, plan.recipientNumber)) hardErrors.push({ type, code: "ADDRESS_FORM_MISMATCH" });
    if (occasionText && (profile !== "yandex" || getOccasionExpressionMode(occasionText) === "EXPLICIT_FORMULA") && isOccasionMissing(value, occasionText)) hardErrors.push({ type, code: "OCCASION_MISSING" });
    if (profile === "yandex") {
      const requiredFacts = normalizeGreetingCoreFacts(plan.coreFacts).filter((fact) => fact.mustPreserve);
      const missingFacts = requiredFacts.filter((fact) => !textContainsFactSignal(value, fact.text));
      if (missingFacts.length > 0) hardErrors.push({ type, code: "MISSING_REQUIRED_FACT", detail: `Не переданы: ${missingFacts.map((fact) => `${fact.id}: «${fact.text}»`).join("; ")}.` });
      const missingWishes = plan.wishes.filter((wish) => !textContainsWishSignal(value, wish));
      if (missingWishes.length > 0) hardErrors.push({ type, code: "MISSING_WISH", detail: `Не переданы wishes: ${missingWishes.map((wish) => `«${wish}»`).join("; ")}.` });
    }
  }

  return { text: value, hardErrors };
};
export const validateComposerVariants = (variants: ComposerVariants, limits: Record<keyof ComposerVariants, number>, plan?: GreetingSemanticPlan, occasionText?: string, compositionPlans?: ComposerCompositionPlans, planRequirements?: ComposerPlanRequirements) => {
  const entries = (Object.keys(variants) as Array<keyof ComposerVariants>).map((type) => ({ type, text: variants[type].text.trim() }));
  const hardErrors: ComposerValidationIssue[] = entries.flatMap(({ type, text }) =>
    validateSingleComposerText(text, limits[type], plan, occasionText, type).hardErrors
  );
  for (let i=0;i<entries.length;i+=1) for (let j=i+1;j<entries.length;j+=1) if(normalize(entries[i].text)===normalize(entries[j].text)) hardErrors.push({ type:entries[j].type,code:"DUPLICATE" });
  const softWarnings: Array<{ type: keyof ComposerVariants; code: string; detail?: string }> = [];
  for (let i=0;i<entries.length;i+=1) for (let j=i+1;j<entries.length;j+=1) {
    const leftTokens = new Set(meaningfulTokens(entries[i].text));
    const rightTokens = new Set(meaningfulTokens(entries[j].text));
    if (Math.min(leftTokens.size, rightTokens.size) < 8) continue;
    const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
    const similarity = overlap / (leftTokens.size + rightTokens.size - overlap);
    if (similarity >= 0.82) softWarnings.push({ type: entries[j].type, code: "VARIANTS_TOO_SIMILAR", detail: `${entries[i].type}/${entries[j].type}: ${similarity.toFixed(2)}` });
  }
  if (planRequirements) {
    const planEntries = (["safe", "warm", "expressive"] as const).map((type) => ({ type, ids: compositionPlans?.[type] }));
    const validIds = new Set(planRequirements.validIds);
    for (const { type, ids } of planEntries) {
      if (!ids) {
        softWarnings.push({ type, code: "COMPOSITION_PLAN_MISSING" });
        continue;
      }
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
      const unknownIds = [...new Set(ids.filter((id) => !validIds.has(id)))];
      const missingIds = planRequirements.requiredIds.filter((id) => !ids.includes(id));
      if (duplicateIds.length > 0) softWarnings.push({ type, code: "COMPOSITION_PLAN_DUPLICATE_ID", detail: duplicateIds.join(", ") });
      if (unknownIds.length > 0) softWarnings.push({ type, code: "COMPOSITION_PLAN_UNKNOWN_ID", detail: unknownIds.join(", ") });
      if (missingIds.length > 0) softWarnings.push({ type, code: "COMPOSITION_PLAN_REQUIRED_ID_MISSING", detail: missingIds.join(", ") });
    }
    if (compositionPlans && planRequirements.requiredIds.length >= 3) {
      const plannedEntries = (["safe", "warm", "expressive"] as const).map((type) => ({ type, signature: compositionPlans[type].join("|") }));
      for (let i=0;i<plannedEntries.length;i+=1) for (let j=i+1;j<plannedEntries.length;j+=1) {
        if (plannedEntries[i].signature === plannedEntries[j].signature) softWarnings.push({ type: plannedEntries[j].type, code: "COMPOSITION_PLANS_IDENTICAL", detail: `${plannedEntries[i].type}/${plannedEntries[j].type}` });
      }
    }
    const humorFactId = compositionPlans?.expressiveHumorFactId;
    if (!planRequirements.humorRequested && humorFactId !== null && humorFactId !== undefined) softWarnings.push({ type: "expressive", code: "COMPOSITION_HUMOR_ID_UNEXPECTED", detail: humorFactId });
    if (planRequirements.humorRequested && (!humorFactId || !planRequirements.factIds.includes(humorFactId))) softWarnings.push({ type: "expressive", code: "COMPOSITION_HUMOR_ID_INVALID", detail: humorFactId ?? "null" });
  }
  return { hardErrors, entries, softWarnings };
};
