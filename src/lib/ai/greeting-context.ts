import type { AiGenerationInput } from "@/lib/ai/types";

export type OccasionCategory =
  | "birthday"
  | "wedding"
  | "anniversary"
  | "graduation"
  | "professional"
  | "gratitude"
  | "farewell"
  | "personal"
  | "custom"
  | "unknown";

export type ExplicitWishTopic =
  | "work"
  | "money"
  | "health"
  | "family"
  | "love"
  | "children"
  | "study"
  | "future"
  | "gratitude";

type RelationshipType = "peer" | "official" | "family" | "romantic" | "unknown";

const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
const patronymic = /^(\p{Lu}[\p{Ll}-]+)\s+\p{Lu}[\p{Ll}-]+(?:ович|евич|ич|овна|евна|ична)$/u;

export const inferAddressName = (recipientName: string, relationshipType: RelationshipType) => {
  const original = recipientName.trim();
  const match = original.match(patronymic);
  const useFirstName = relationshipType === "peer" && Boolean(match);

  return {
    recipientOriginalName: original,
    addressName: useFirstName ? match![1] : original,
    addressNameReason: useFirstName
      ? "peer context with patronymic name, using first name to avoid official tone"
      : "original name preserved"
  };
};

const occasionRules: Array<[OccasionCategory, RegExp]> = [
  ["birthday", /дн\p{L}*\s+рождени/iu],
  ["wedding", /свадьб|жених|невест/iu],
  ["anniversary", /юбиле/iu],
  ["graduation", /выпускн|диплом|окончани\p{L}*\s+(?:учеб|школ|университет)/iu],
  ["farewell", /увольнен|переход|прощаемся|прощани/iu],
  ["gratitude", /благодар|спасибо/iu],
  ["professional", /профессиональн\p{L}*\s+праздник|день\s+(?:учителя|воспитателя|врача|строителя)/iu],
  ["personal", /годовщин|новосель|рождени\p{L}*\s+ребен/iu]
];

const wishRules: Array<[ExplicitWishTopic, RegExp]> = [
  ["work", /работ|професси|должност|карьер|ваканси/iu],
  ["money", /зарплат|доход|оплат|деньг|заработ/iu],
  ["health", /здоров|выздоров|сил\p{L}*\s+и\s+энерги/iu],
  ["family", /семь|семейн|родн/iu],
  ["love", /любов|любим/iu],
  ["children", /дет|ребен|сын|доч/iu],
  ["study", /учеб|школ|университет|диплом|экзамен|выпускн/iu],
  ["future", /будущ|впереди|нов\p{L}*\s+этап/iu],
  ["gratitude", /благодар|спасибо|ценю/iu]
];

export const inferOccasionContext = (
  input: Pick<AiGenerationInput, "occasionText" | "relationshipContext" | "draftNotes">
) => {
  const occasionSource = normalize(`${input.occasionText} ${input.draftNotes}`);
  const allSource = normalize(`${input.occasionText} ${input.relationshipContext ?? ""} ${input.draftNotes}`);
  const occasionCategory = occasionRules.find(([, pattern]) => pattern.test(occasionSource))?.[0]
    ?? (occasionSource.trim() ? "custom" : "unknown");
  const explicitWishTopics = wishRules
    .filter(([, pattern]) => pattern.test(allSource))
    .map(([topic]) => topic);
  const overloadedWishTopics = getOverloadedWishTopics(explicitWishTopics);

  return {
    occasionCategory,
    explicitWishTopics,
    wishTopics: explicitWishTopics,
    overloadedWishTopics,
    safeWishSummary: buildSafeWishSummary(explicitWishTopics, occasionCategory),
    safeWishOptions: buildSafeWishOptions(explicitWishTopics, occasionCategory)
  };
};

export const getOverloadedWishTopics = (topics: ExplicitWishTopic[]) => {
  const careerCluster = topics.filter((topic) => ["work", "money", "future"].includes(topic));
  if (careerCluster.length >= 2) return careerCluster;
  return topics.length >= 4 ? topics.filter((topic) => topic !== "gratitude") : [];
};

export const buildSafeWishSummary = (
  topics: ExplicitWishTopic[],
  occasionCategory: OccasionCategory
) => {
  const has = (topic: ExplicitWishTopic) => topics.includes(topic);

  if (has("work") && (has("money") || has("future"))) {
    return "найти место, где интересно и ценят твой труд";
  }
  if (has("health") && has("family")) return "сил, спокойствия и тепла рядом с близкими";
  if (has("love") && has("family")) return "тепла, взаимности и радости в семье";
  if (has("study") && has("future")) return "уверенно перейти к следующему важному этапу";
  if (has("gratitude")) return "сохранить благодарность главным смыслом текста";
  if (has("health")) return "сил и хорошего самочувствия";
  if (has("love")) return "тепла и взаимности";
  if (has("family")) return "тепла и спокойствия рядом с близкими";
  if (has("work")) return "найти дело и окружение, которые подходят человеку";
  if (has("money")) return "чтобы труд ценили по достоинству";
  if (has("future")) return "уверенно двигаться к следующему этапу";

  const defaults: Partial<Record<OccasionCategory, string>> = {
    birthday: "больше тёплых и радостных событий",
    wedding: "тепла, взаимности и радости в совместной жизни",
    anniversary: "беречь всё хорошее, что уже создано вместе",
    graduation: "уверенно перейти к следующему важному этапу",
    professional: "интереса к делу и уважения окружающих",
    gratitude: "сохранить благодарность главным смыслом текста",
    farewell: "с теплом перейти к новому этапу",
    personal: "больше тёплых событий и спокойной уверенности"
  };
  return defaults[occasionCategory] ?? "не добавлять отдельное пожелание без необходимости";
};

export const buildSafeWishOptions = (
  topics: ExplicitWishTopic[],
  occasionCategory: OccasionCategory
) => {
  const has = (topic: ExplicitWishTopic) => topics.includes(topic);
  if (occasionCategory === "graduation" && has("work")) {
    return [
      "хороший старт после выпуска",
      "место, где будет интересно",
      "люди, которые ценят ответственность",
      "больше спокойствия и уверенности на следующем этапе",
      "чтобы дальше всё складывалось по делу"
    ];
  }
  if (occasionCategory === "birthday") {
    return ["больше радостных событий", "спокойствия и сил", "хороших людей рядом"];
  }
  if (occasionCategory === "wedding") {
    return ["тепла и взаимности", "радости в совместной жизни", "поддержки друг друга"];
  }
  if (occasionCategory === "farewell") {
    return ["хорошего следующего этапа", "новых интересных возможностей", "людей, с которыми будет легко работать"];
  }
  if (occasionCategory === "gratitude" || has("gratitude")) {
    return ["сохранить благодарность главным смыслом", "больше добрых событий впереди", "тепла и поддержки рядом"];
  }
  if (has("health")) return ["сил и хорошего самочувствия", "спокойствия", "приятных событий впереди"];
  if (has("family") || has("love")) return ["тепла рядом с близкими", "взаимности", "больше совместной радости"];
  if (has("work")) return ["интересного дела", "людей, которые ценят вклад", "уверенного следующего этапа"];
  return [buildSafeWishSummary(topics, occasionCategory)];
};

export const normalizeOccasionForSentence = (value: string) => {
  const cleaned = value.trim().replace(/[.!?]+$/, "");
  if (!cleaned) return "";
  const sentence = cleaned.charAt(0).toLocaleLowerCase("ru-RU") + cleaned.slice(1);
  return sentence.replace(
    /(Выпускным|Днём|Днем|Рождения|Свадьбой|Юбилеем)/gu,
    (word) => word.toLocaleLowerCase("ru-RU")
  );
};

export const prepareDraftForPrompt = (draftNotes: string, safeWishSummary: string) => {
  const wishLead = /(?:нужно|хочу|желаю|пожелать|пусть)\s+[^.!?]*(?:работ|зарплат|доход|карьер|должност|професси)[^.!?]*/giu;
  let summaryInserted = false;
  const prepared = draftNotes.replace(wishLead, () => {
    if (summaryInserted) return "";
    summaryInserted = true;
    return `Пожелание: ${safeWishSummary}`;
  });
  return prepared.replace(/\s{2,}/g, " ").trim();
};
