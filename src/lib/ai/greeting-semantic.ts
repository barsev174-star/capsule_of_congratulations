import type { LadderRawInput } from "@/lib/ai/greeting-ladder";

export const GREETING_PROMPT_VERSION = "semantic-v1";

export type GreetingSemanticPlan = {
  authorVoice: "I" | "WE" | "NEUTRAL" | "AMBIGUOUS";
  addressForm: "TY" | "VY" | "NEUTRAL" | "AMBIGUOUS";
  recipientNumber: "ONE" | "MANY" | "AMBIGUOUS";
  coreFacts: string[];
  contextFacts: string[];
  appreciation: string[];
  wishes: string[];
  derivedQualities: Array<{ quality: string; basedOnFactIndexes: number[] }>;
  styleRequest: { humor: "REQUESTED" | "NOT_REQUESTED"; notes: string[] };
  variantApproach: { safe: string; warm: string; expressive: string };
  ambiguities: string[];
};

export type SemanticVariantType = "safe" | "warm" | "expressive";
export type SemanticVariants = Record<SemanticVariantType, { text: string }>;

export const normalizeGreetingInput = (input: LadderRawInput) => ({
  ...input,
  recipientName: input.recipientName.trim(),
  occasionText: input.occasionText.trim(),
  fromLabel: input.fromLabel?.trim(),
  draftNotes: input.draftNotes.replace(/\r\n?/g, "\n").replace(/\n[\t ]*\n+/g, "\n\n").trim()
});

export const getSemanticLimits = (messageLimit: number) => ({
  safe: messageLimit,
  warm: messageLimit,
  expressive: messageLimit
});

const promptRules = `Ты редактируешь поздравления на русском языке.

Поля формы задают контекст, а черновик пользователя — главный источник фактов, пожеланий, благодарности и интонации. Сначала выдели компактный смысловой план, затем независимо составь три варианта как прямые сообщения получателю.

Не придумывай события, отношения, предметы и биографические детали. Качество допустимо только если оно прямо подтверждается фактами. Не усиливай частоту, уверенность, близость или масштаб поступка. Конкретные пожелания важнее универсальных. Юмор используй только по явной просьбе и только на основе факта из черновика.

При неоднозначности автора или обращения используй естественную нейтральную конструкцию. Не вставляй подпись автора в поздравление. Верни только JSON по схеме.`;

const semanticPriorityRules = `
Дополнительные обязательные правила.

Форму обращения определяй прежде всего по черновику пользователя. Если в черновике есть прямое «ты», «тебя», «тебе», «твой» или неформальная интонация, сохраняй «ты» даже при имени с отчеством. Если в черновике есть «вы», «вас», «вам», «ваш», сохраняй вежливую форму. Имя получателя и подпись открытки дают контекст, но не отменяют явный сигнал черновика. При неоднозначности выбирай естественную нейтральную или вежливую конструкцию и не смешивай «ты/вы».

Повод из поля «Повод» обязателен. В каждом из трёх вариантов один раз естественно назови именно этот повод. Не пропускай его и не заменяй общим «с праздником». Не меняй само событие.

Дополнительная просьба пользователя — это редакторская задача, а не тема готового поздравления. Выполняй её молча: не пересказывай, не объясняй и не оценивай собственный творческий приём в тексте. Если просьба просит добавить юмор, образность, серьёзность или иной оттенок, результат должен читаться естественно и без комментария автора о том, какой приём был использован.

Не добавляй неподтверждённые факты, действия, отношения или будущие обещания. Не усиливай частотность, степень близости или масштаб поступка: сохраняй меру, заданную черновиком. Три варианта должны отличаться построением и подачей: «Живее» не может быть «Аккуратно» с заменой нескольких слов.

В смысловом плане обязательно заполни поле variantApproach: коротко опиши три разные композиции для «Аккуратно», «Теплее» и «Живее». Затем следуй этому плану. Перед возвратом молча сравни варианты: у них должны различаться порядок мысли, центр тяжести или приём подачи при сохранении одних фактов.`;

const compactPromptRules = `Ты редактируешь русские поздравления для онлайн-открытки. Верни только JSON по заданной схеме.

Иерархия источников:
1. Черновик — главный источник фактов, личного случая, пожеланий, голоса автора и формы обращения.
2. Поля «Кому», «Повод», «От кого» дают контекст. Они не отменяют явный сигнал из черновика.

Сначала составь компактный смысловой план. В plan.variantApproach укажи три разные композиции будущих вариантов и затем следуй им.

Форма обращения: сохраняй явное «ты» или «вы» из черновика. Имя с отчеством не меняет явное «ты». При отсутствии явного сигнала выбери естественную нейтральную или вежливую форму; не смешивай «ты/вы». Сохраняй «я/мы» из черновика. Подпись автора не вставляй в текст.

Факты и пожелания: не придумывай событий, отношений, действий, предметов, обещаний или биографических подробностей. Можно назвать только качество, прямо следующее из факта. Не усиливай меру: «часто» не становится «всегда», а помощь не становится подвигом. Не заменяй конкретные пожелания общими.

Повод: в каждом варианте естественно назови именно повод из поля «Повод» один раз. Не пропускай и не подменяй его общим «с праздником».

Дополнительная просьба пользователя — редакторская задача, а не содержание поздравления. Выполняй её молча: не пересказывай, не объясняй и не оценивай приём в готовом тексте. Юмор допустим только по явной просьбе и только на основе факта из черновика.

Режимы:
- «Аккуратно»: исправь язык и структуру, оставайся близко к смыслу и не добавляй оценок, образов или новых пожеланий.
- «Теплее»: выполни всё из «Аккуратно»; яснее покажи благодарность, личное отношение или качество, подтверждённое фактом.
- «Живее»: выполни всё из «Теплее»; выбери иную композицию и один образный или игровой приём, основанный на факте. Не повторяй «Аккуратно» с заменой нескольких слов.

Перед возвратом молча проверь: каждый текст — прямое, естественное сообщение получателю; повод назван; факты, пожелания и голос сохранены; новых фактов нет; три варианта различаются.`;

export const buildSemanticPrompt = (input: LadderRawInput) => {
  const normalized = normalizeGreetingInput(input);
  const limits = getSemanticLimits(normalized.messageLimit);
  return {
    limits,
    system: compactPromptRules,
    user: `Подготовь смысловой план и три независимых варианта поздравления.

Аккуратно: исправь язык, структуру и повторы; сохрани факты, благодарность, пожелания и голос автора; не добавляй оценки, образы и пожелания.
Теплее: сохрани требования «Аккуратно»; сделай благодарность и личное отношение заметнее; можно назвать качество, прямо подтверждённое фактом.
Живее: сохрани факты, пожелания и голос автора; сделай текст выразительнее; допустим один образный или игровой приём на основе факта; юмор — только по явной просьбе.

Варианты должны отличаться построением и эмоциональностью, а не только словами. Не обрезай текст и не заканчивай многоточием.

Контекст:
Кому: ${normalized.recipientName}
Повод: ${normalized.occasionText}
От кого: ${normalized.fromLabel || "не указано"}
Черновик:
${normalized.draftNotes}

Лимиты: Аккуратно — ${limits.safe}; Теплее — ${limits.warm}; Живее — ${limits.expressive} символов.`
  };
};

const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export const greetingLength = (value: string) => Array.from(value).length;

export const validateSemanticVariants = (variants: SemanticVariants, limits: Record<SemanticVariantType, number>) => {
  const entries = (Object.keys(variants) as SemanticVariantType[]).map((type) => ({ type, text: variants[type].text.trim() }));
  const hardErrors = entries.flatMap(({ type, text }) => {
    if (!text) return [{ type, code: "EMPTY" }];
    if (greetingLength(text) > limits[type]) return [{ type, code: "TOO_LONG" }];
    if (/^(?:json|план|вариант)\s*[:{]/iu.test(text)) return [{ type, code: "TECHNICAL_TEXT" }];
    return [];
  });
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (normalize(entries[left].text) === normalize(entries[right].text)) hardErrors.push({ type: entries[right].type, code: "DUPLICATE" });
    }
  }
  const softWarnings = entries.flatMap(({ type, text }) => [
    /(?<!\p{L})мы(?!\p{L})/iu.test(text) ? { type, code: "AUTHOR_VOICE_AMBIGUOUS" } : null,
    /(?<!\p{L})(?:ты|тебе|тебя|тво\p{L}*)(?!\p{L})/iu.test(text) ? { type, code: "ADDRESS_FORM_AMBIGUOUS" } : null
  ].filter((warning): warning is { type: SemanticVariantType; code: string } => warning !== null));
  return { hardErrors, softWarnings, entries };
};

export const buildSemanticRepairPrompt = (base: ReturnType<typeof buildSemanticPrompt>, plan: GreetingSemanticPlan, type: SemanticVariantType, text: string, code: string) => ({
  system: promptRules,
  user: `${base.user}\n\nИсправь только вариант ${type}. Причина: ${code}. Сохрани смысловой план, факты, пожелания и стиль. Не меняй остальные варианты.\nПлан: ${JSON.stringify(plan)}\nНеудачный вариант: ${text}`
});
