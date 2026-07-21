const normalize = (value: string) => value
  .toLocaleLowerCase("ru-RU")
  .replace(/ё/g, "е")
  .replace(/\s+/g, " ")
  .trim();

const detailRules = [
  { id: "period", source: /всю\s+(?:учеб|жизн|дорог)\p{L}*|много\s+лет|кажд\p{L}*\s+раз|в\s+трудн\p{L}*\s+момент/iu },
  { id: "author-impact", source: /без\s+(?:нее|него|тебя|вас)[^.!?]{0,70}(?:оценк|сложн|хуже|труднее)|мне\s+было\s+легче|очень\s+помог|это\s+многое\s+значил/iu },
  { id: "help-action", source: /приходил\p{L}*\s+на\s+помощь|помог\p{L}*|выручал\p{L}*|поддерживал\p{L}*/iu },
  { id: "explain-action", source: /объяснял\p{L}*/iu },
  { id: "punctual", source: /пунктуальн\p{L}*/iu },
  { id: "reliable", source: /надежн\p{L}*|надёжн\p{L}*/iu },
  { id: "kind", source: /добр\p{L}*/iu },
  { id: "attentive", source: /внимательн\p{L}*/iu },
  { id: "responsible", source: /ответственн\p{L}*/iu }
] as const;

export type DraftSpecificDetail = typeof detailRules[number]["id"];

export type DraftSpecifics = {
  specificFacts: string[];
  strongDetails: DraftSpecificDetail[];
  personalConsequences: string[];
  concreteActions: string[];
  concreteQualities: string[];
  weakGenericDetails: string[];
};

const genericRules = [
  /ценят\p{L}*\s+(?:твой|ваш)?\s*труд/iu,
  /люд\p{L}*[^.!?]{0,30}ценят/iu,
  /следующ\p{L}*\s+этап/iu,
  /спокойств\p{L}*\s+и\s+уверенност/iu,
  /вс[её]\s+сложит/iu,
  /хорош\p{L}*\s+люд/iu
];

export const extractDraftSpecifics = (draftNotes: string): DraftSpecifics => {
  const normalized = normalize(draftNotes);
  const strongDetails = detailRules.filter((rule) => rule.source.test(normalized)).map((rule) => rule.id);
  const specificFacts = draftNotes
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => detailRules.some((rule) => rule.source.test(normalize(sentence))));
  const matchingSentences = (ids: DraftSpecificDetail[]) => specificFacts.filter((sentence) =>
    detailRules.some((rule) => ids.includes(rule.id) && rule.source.test(normalize(sentence)))
  );
  const personalConsequences = matchingSentences(["author-impact"]);
  const concreteActions = matchingSentences(["help-action", "explain-action"]);
  const concreteQualities = strongDetails.filter((detail) =>
    ["punctual", "reliable", "kind", "attentive", "responsible"].includes(detail)
  );
  const weakGenericDetails = genericRules
    .filter((pattern) => pattern.test(normalized))
    .map((pattern) => pattern.source);

  return {
    specificFacts,
    strongDetails,
    personalConsequences,
    concreteActions,
    concreteQualities,
    weakGenericDetails
  };
};

const outputMatchers: Record<DraftSpecificDetail, RegExp> = {
  period: /всю\s+(?:учеб|жизн|дорог)\p{L}*|много\s+лет|кажд\p{L}*\s+раз|в\s+трудн\p{L}*\s+момент/iu,
  "author-impact": /без\s+(?:нее|него|тебя|вас|твоей|вашей)[^.!?]{0,75}(?:оценк|сложн|хуже|труднее)|оценк\p{L}*[^.!?]{0,35}скромнее|учит\p{L}*\s+было\s+(?:легче|сложнее)|это\s+(?:правда\s+)?многое\s+значил/iu,
  "help-action": /приходил\p{L}*\s+на\s+помощь|помог\p{L}*|помощ|выручал\p{L}*|поддерживал\p{L}*|поддержк/iu,
  "explain-action": /объяснял\p{L}*/iu,
  punctual: /пунктуальн\p{L}*|всегда\s+вовремя/iu,
  reliable: /надежн\p{L}*|надёжн\p{L}*|можно\s+положиться/iu,
  kind: /добр\p{L}*/iu,
  attentive: /внимательн\p{L}*/iu,
  responsible: /ответственн\p{L}*/iu
};

export const matchDraftSpecifics = (text: string, specifics: DraftSpecifics) => {
  const normalized = normalize(text);
  return specifics.strongDetails.filter((detail) => outputMatchers[detail].test(normalized));
};

export const findGenericPhraseIssues = (text: string) => {
  const normalized = normalize(text);
  return genericRules.filter((pattern) => pattern.test(normalized)).map((pattern) => pattern.source);
};
