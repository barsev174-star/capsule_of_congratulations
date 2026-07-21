import { buildLadderContext, type LadderRawInput } from "@/lib/ai/greeting-ladder";

export type GreetingContentPlan = {
  generalActions: string[];
  personalEpisodes: string[];
  wishes: string[];
  derivedQualities: string[];
  creativeRequest: string;
  optionalContextDetails: string[];
};

const normalizeAddressMode = (value: string | undefined) => value === "tu" || value === "vy" ? value : undefined;

const authorVoice = (fromLabel: string | undefined, context: ReturnType<typeof buildLadderContext>) => {
  if (context.authorNumber === "singular") return "Автор один: пиши от первого лица в единственном числе, не переходи на «мы».";
  if (context.authorNumber === "plural") return "Авторов несколько: сохраняй форму «мы».";
  return fromLabel?.trim()
    ? "Подпись принадлежит одному автору: используй первое лицо единственного числа, не вставляя подпись в текст."
    : "Число авторов неизвестно: не используй «я» или «мы» без необходимости.";
};

export const buildTwoStepPlanPrompt = (input: LadderRawInput) => ({
  system: `Ты извлекаешь содержание из черновика личного поздравления. Верни только JSON по заданной структуре.

generalActions — повторяющиеся действия получателя, personalEpisodes — конкретные события автора, wishes — только явно названные пожелания, derivedQualities — не более двух качеств, прямо следующих из поступков, creativeRequest — только явная просьба о стиле.

Идентификационные сведения (имя, роль, номер квартиры, должность) сами по себе не являются содержанием. Включай их в optionalContextDetails лишь когда они добавляют смысл, а не просто называют участника. Не выдумывай и не усиливай факты.`,
  user: `Данные формы:
Получатель: ${input.recipientName}
Повод: ${input.occasionText}
Подпись автора: ${input.fromLabel || "не указана"}

Черновик:
${input.draftNotes}`
});

export const buildTwoStepComposePrompt = (input: LadderRawInput, plan: GreetingContentPlan) => {
  const context = buildLadderContext(input);
  const addressMode = normalizeAddressMode(process.env.AI_GREETING_TWO_STEP_ADDRESS_MODE) ?? context.addressMode;
  const pronouns = addressMode === "tu"
    ? "Обращайся на «ты», не используй «вы»."
    : addressMode === "vy"
      ? "Обращайся на «вы», не используй «ты»."
      : "Если форма обращения неясна, избегай прямых местоимений «ты/вы».";
  // The careful version must still be able to preserve an occasion, a personal
  // episode and explicit wishes. The old 190-character cap forced the model to
  // drop one of them on ordinary, detailed drafts.
  const limits = { safe: Math.min(input.messageLimit, 250), warm: Math.min(input.messageLimit, 270), expressive: Math.min(input.messageLimit, 300) };

  return {
    context,
    limits,
    system: `Ты редактор русских личных поздравлений. Верни только JSON по заданной структуре.

Пиши прямое сообщение получателю, не характеристику со стороны. Обращайся непосредственно к адресату во втором лице или в форме, указанной в контексте; не называй его «получателем», «соседом», «коллегой» или иной ролью от третьего лица. Данные формы и смысловой план — единственные источники содержания. Не вставляй подпись автора: она отображается интерфейсом отдельно. Не обязан использовать optionalContextDetails — включай их только если они улучшают смысл. Не используй номера квартир, должности и другие анкетные сведения, если без них не теряется конкретный факт.

Неприкосновенные элементы: в каждом из трёх вариантов естественно вплети повод в поздравление — например, через обращение или первую фразу. Никогда не выводи названия полей, метки, двоеточия или служебные конструкции. Естественно сохрани все пункты generalActions, personalEpisodes и wishes. Нельзя заменять конкретный факт или пожелание более общей фразой. Не повторяй один и тот же факт сначала как поступок, а затем как качество. Три версии должны отличаться построением фраз и подачей; не начинай их одинаковым предложением и не повторяй одно предложение дословно во всех версиях. Если заданный лимит не позволяет уместить все элементы, сделай фразы короче, но ничего не убирай. Не усиливай «часто» до «всегда» и не добавляй новых пожеланий.

safe: только ясная редактура, без новых оценок и образов.
warm: та же основа, яснее личная благодарность; можно использовать одно качество из derivedQualities.
expressive: та же основа; если creativeRequest просит юмор, добавь только сюда одну короткую шутливую финальную фразу на основе personalEpisodes — без метки, объяснения или фраз вроде «шутка в конце».

Не смешивай режимы: safe не содержит новых оценок, warm не содержит юмора, expressive содержит творческий финал только при явной просьбе.`,
    user: `Контекст:
— Обращение: ${context.address}
— Повод: ${input.occasionText}
— ${authorVoice(input.fromLabel, context)}
— ${pronouns}
— Лимиты: safe до ${limits.safe}, warm до ${limits.warm}, expressive до ${limits.expressive} символов.

Смысловой план:
${JSON.stringify(plan)}`
  };
};
