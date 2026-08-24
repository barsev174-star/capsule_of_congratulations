import type { UniversalTemplateFixtureId } from "@/lib/templates/profile";

export const universalMessageScenarios = [
  "grid-2",
  "carousel-1",
  "carousel-2",
  "portrait",
  "landscape-pair",
  "landscape-trio"
] as const;

export type UniversalMessageScenario = (typeof universalMessageScenarios)[number];

export type UniversalFixtureCrop = {
  x: number;
  y: number;
  zoom: number;
};

export type UniversalFixturePhoto = {
  id: string;
  src: `/${string}`;
  width: number;
  height: number;
  caption: string;
  crop: UniversalFixtureCrop;
};

export type UniversalFixtureContribution = {
  id: string;
  authorName: string;
  authorRole?: string;
  message: string;
};

export type UniversalFixtureQuote = {
  id: string;
  text: string;
};

export type UniversalTemplateFixture = {
  id: UniversalTemplateFixtureId;
  label: string;
  description: string;
  recipientName: string;
  occasion: string;
  eventDate: string | null;
  fromLabel: string;
  heroDescription?: string;
  summaryTitle?: string;
  mainGreetingAuthorName?: string;
  mainGreeting: string;
  privateSignature: string;
  qualities: readonly string[];
  contributions: readonly UniversalFixtureContribution[];
  quoteCandidates: readonly UniversalFixtureQuote[];
  organizerQuoteIds: readonly [string, string, string] | readonly [];
  recipientQuoteIds: readonly [string, string, string] | readonly [];
  photos: readonly UniversalFixturePhoto[];
  memoryPhotoIds: readonly [string, string, string] | readonly [];
  memoryTitle: string;
  memoryDescription: string;
};

export type UniversalFixtureValidationIssue = {
  path: string;
  message: string;
};

const exactLength = (seed: string, length: number) => {
  const normalized = seed.trim().replace(/\s+/g, " ");
  const repeated = `${normalized} `.repeat(Math.ceil(length / (normalized.length + 1)));
  return repeated.slice(0, length).trimEnd().padEnd(length, "я");
};

const createdMessages = [
  ["Анна", "подруга", "Пусть рядом всегда будут люди, с которыми легко смеяться, мечтать и оставаться собой."],
  ["Михаил", "коллега", "Спасибо за спокойствие, внимание к деталям и редкое умение поддержать именно тогда, когда это нужно."],
  ["Ольга", "сестра", "Желаю больше счастливых поездок, уютных вечеров и смелых планов, которые обязательно сбудутся."],
  ["Илья", "друг", "Ты умеешь превращать обычный день в хорошую историю. Сохраняй эту лёгкость и любопытство к жизни."],
  ["Марина", "коллега", "Пусть работа радует результатами, а за её пределами всегда остаётся время на самое важное."],
  ["Сергей", "друг", "Желаю здоровья, энергии и множества поводов гордиться собой и людьми рядом."],
  ["Наталья", "подруга", "Спасибо за честность, тепло и умение замечать хорошее даже в непростые дни."],
  ["Алексей", "коллега", "Пусть новый год жизни принесёт ясные решения, сильные проекты и приятные неожиданности."],
  ["Вера", "подруга", "Оставайся человеком, рядом с которым спокойно, интересно и по-настоящему радостно."],
  ["Дмитрий", "друг", "Пусть впереди будет больше встреч, которые хочется запомнить, и дорог, по которым хочется идти."],
  ["Елена", "коллега", "Желаю вдохновения, внутренней свободы и уверенности в каждом новом начинании."],
  ["Павел", "друг", "Пусть всё задуманное складывается красиво, вовремя и рядом с теми, кто тебя ценит."]
] as const;

const contributions: readonly UniversalFixtureContribution[] = createdMessages.map(
  ([authorName, authorRole, message], index) => ({
    id: `message-${index + 1}`,
    authorName,
    authorRole,
    message
  })
);

const photoSeeds = [
  { src: "/examples/kristina/1.jpg", width: 1600, height: 1067 },
  { src: "/examples/kristina/2.jpg", width: 1067, height: 1600 },
  { src: "/examples/kristina/3.jpg", width: 1600, height: 1067 },
  { src: "/examples/kristina/4.jpg", width: 1200, height: 1200 },
  { src: "/examples/kristina/5.jpg", width: 1600, height: 900 },
  { src: "/examples/kristina/6.jpg", width: 900, height: 1600 }
] as const;

const captions = [
  "Вечер, который хочется запомнить",
  "Самая тёплая прогулка этого года",
  "Когда все наконец собрались вместе",
  "Маленький праздник без особого повода",
  "Смех, разговоры и любимая музыка",
  "Ещё одна точка на нашей общей карте"
] as const;

const photos: readonly UniversalFixturePhoto[] = photoSeeds.map((photo, index) => ({
  id: `photo-${index + 1}`,
  ...photo,
  caption: captions[index],
  crop: { x: 0.5, y: 0.5, zoom: 1 }
}));

const quoteCandidates: readonly UniversalFixtureQuote[] = [
  { id: "quote-1", text: "С тобой даже самый обычный день становится теплее." },
  { id: "quote-2", text: "Ты умеешь быть рядом именно тогда, когда это особенно важно." },
  { id: "quote-3", text: "Пусть впереди будет больше моментов, которые хочется сохранить." },
  { id: "quote-4", text: "Твоя доброта всегда возвращает людям веру в хорошее." },
  { id: "quote-5", text: "Рядом с тобой легко смеяться, мечтать и начинать новое." },
  { id: "quote-6", text: "Спасибо за тепло, которое ты создаёшь вокруг себя." }
];

const baseFixture = {
  recipientName: "Кристина",
  occasion: "С днём рождения!",
  eventDate: "2026-08-11",
  fromLabel: "от друзей и коллег",
  mainGreeting:
    "Кристина, с днём рождения! Мы собрали эту открытку, чтобы сохранить важные слова, добрые воспоминания и ощущение праздника. Спасибо за твою поддержку, лёгкость и умение делать любой день теплее. Пусть впереди будет много счастливых встреч, смелых планов и людей, рядом с которыми можно быть собой.",
  privateSignature: "С любовью и благодарностью — от тех, кто всегда рядом.",
  qualities: ["доброта", "чувство юмора", "надёжность", "внимание", "вдохновение"],
  contributions,
  quoteCandidates,
  organizerQuoteIds: ["quote-1", "quote-2", "quote-3"],
  recipientQuoteIds: ["quote-3", "quote-1", "quote-5"],
  photos,
  memoryPhotoIds: ["photo-2", "photo-4", "photo-6"],
  memoryTitle: "Моменты, которые хочется сохранить",
  memoryDescription: "Три фотографии о встречах, улыбках и днях, к которым приятно возвращаться."
} as const;

const textStressPhotos: readonly UniversalFixturePhoto[] = photos.map((photo, index) => ({
  ...photo,
  caption: index === 0
    ? exactLength("Счастливый день, который останется с нами", 45)
    : photo.caption,
  crop: index === 0
    ? { x: 0, y: 0, zoom: 3 }
    : index === 1
      ? { x: 1, y: 1, zoom: 2.8 }
      : photo.crop
}));

const stressQuoteCandidates: readonly UniversalFixtureQuote[] = quoteCandidates.map((quote, index) => (
  index === 0 ? { ...quote, text: exactLength("Самая длинная фраза проверяет безопасную область и сохраняет весь важный смысл без потери слов", 100) } : quote
));

export const universalTemplateFixtures: Readonly<Record<UniversalTemplateFixtureId, UniversalTemplateFixture>> = {
  "full-card-default": {
    id: "full-card-default",
    label: "Полная открытка",
    description: "Все блоки, 12 поздравлений, 5 качеств, 3 выбранные фразы и 6 фотографий.",
    ...baseFixture
  },
  "teacher-classic": {
    id: "teacher-classic",
    label: "Учителю — классический",
    description: "Анна Сергеевна, 20 поздравлений, 5 качеств, 3 лучшие фразы и 4 тематические фотографии.",
    recipientName: "Анна Сергеевна",
    occasion: "Всемирный день учителя",
    eventDate: "2026-10-05",
    fromLabel: "от учеников, родителей и выпускников",
    heroDescription: "Слова благодарности, школьные моменты и пожелания специально для Вас.",
    summaryTitle: "Главное поздравление",
    mainGreetingAuthorName: "Ученики, родители и выпускники",
    mainGreeting:
      "Анна Сергеевна, поздравляем Вас со Всемирным днём учителя! Спасибо за знания, терпение и ту особую атмосферу, в которой детям не страшно задавать вопросы, ошибаться и пробовать снова. Вы умеете замечать сильные стороны каждого, поддерживать в нужный момент и вдохновлять двигаться дальше. Пусть Ваша работа приносит радость и гордость за учеников, рядом будут благодарные дети и родители, а в жизни всегда остаётся время для себя, семьи, мечтаний и счастливых событий.",
    privateSignature: "С теплом и благодарностью — ученики, родители и выпускники.",
    qualities: ["внимательная", "справедливая", "терпеливая", "вдохновляющая", "мудрая"],
    contributions: [
      { id: "teacher-message-1", authorName: "Маша", authorRole: "ученица", message: "Анна Сергеевна, со Всемирным днём учителя! Спасибо, что на Ваших уроках всегда интересно и не страшно ошибаться. Желаю Вам побольше радостных дней, добрых учеников и отличного настроения!" },
      { id: "teacher-message-2", authorName: "Илья", authorRole: "ученик", message: "Поздравляю Вас со Всемирным днём учителя! Спасибо за терпение, чувство юмора и за то, что умеете объяснить даже самое сложное. Пусть ученики радуют успехами, а каждый школьный день приносит что-то хорошее." },
      { id: "teacher-message-3", authorName: "Софья", authorRole: "ученица", message: "Анна Сергеевна, спасибо Вам за поддержку и за то, что Вы всегда замечаете, когда кому-то нужна помощь. Со Всемирным днём учителя! Желаю Вам вдохновения, лёгких уроков и много поводов улыбаться." },
      { id: "teacher-message-4", authorName: "Артём", authorRole: "ученик", message: "Со Всемирным днём учителя, Анна Сергеевна! Желаю, чтобы в классе чаще звучали правильные ответы, реже забывались домашние задания, а у Вас всегда оставались силы, терпение и хорошее настроение." },
      { id: "teacher-message-5", authorName: "Полина", authorRole: "ученица", message: "Анна Сергеевна, поздравляю со Всемирным днём учителя! Спасибо, что верите в нас даже тогда, когда мы сами сомневаемся. Желаю Вам добрых людей рядом, интересных идей и учеников, которыми можно гордиться." },
      { id: "teacher-message-6", authorName: "Максим", authorRole: "ученик", message: "Спасибо Вам за то, что умеете сделать обычный урок интересным и всегда объясняете ещё раз, если что-то не получилось понять. Со Всемирным днём учителя! Желаю Вам радости, здоровья и отличных классов." },
      { id: "teacher-message-7", authorName: "Лиза", authorRole: "ученица", message: "Анна Сергеевна, со Всемирным днём учителя! Пусть у Вас будет больше спокойных уроков, приятных сюрпризов и ученических побед. Спасибо за доброту, справедливость и за то, что с Вами хочется стараться." },
      { id: "teacher-message-8", authorName: "Даниил", authorRole: "ученик", message: "Поздравляю со Всемирным днём учителя! Спасибо Вам за знания и за то, что никогда не смеётесь над нашими ошибками, а помогаете разобраться. Желаю Вам терпения, вдохновения и много счастливых дней вне школы." },
      { id: "teacher-message-9", authorName: "Вика", authorRole: "ученица", message: "Анна Сергеевна, спасибо, что умеете быть и строгой, и доброй именно тогда, когда это нужно. Со Всемирным днём учителя! Пусть работа приносит удовольствие, а ученики чаще удивляют Вас хорошими результатами." },
      { id: "teacher-message-10", authorName: "Кирилл", authorRole: "ученик", message: "Со Всемирным днём учителя! Желаю Вам как можно меньше проверять исправлений и как можно чаще ставить пятёрки. Спасибо за Ваше терпение, понятные объяснения и за то, что всегда можно обратиться с вопросом." },
      { id: "teacher-message-11", authorName: "Екатерина", authorRole: "мама Маши", message: "Анна Сергеевна, поздравляем Вас со Всемирным днём учителя! Спасибо за внимание к детям, терпение и искреннюю вовлечённость. Пусть Ваш труд возвращается уважением, успехами учеников и благодарностью семей." },
      { id: "teacher-message-12", authorName: "Алексей", authorRole: "папа Ильи", message: "Со Всемирным днём учителя, Анна Сергеевна! Спасибо за умение не только давать знания, но и поддерживать детей, учить их самостоятельности и ответственности. Желаем Вам сил, вдохновения и спокойных учебных дней." },
      { id: "teacher-message-13", authorName: "Ольга", authorRole: "мама Софьи", message: "Анна Сергеевна, благодарим Вас за заботу, мудрость и атмосферу доверия в классе. Со Всемирным днём учителя! Пусть рядом будут понимающие родители, любознательные дети и много поводов гордиться своей работой." },
      { id: "teacher-message-14", authorName: "Наталья", authorRole: "мама Полины", message: "Поздравляем Вас со Всемирным днём учителя! Спасибо, что видите в каждом ребёнке личность и помогаете раскрывать сильные стороны. Желаем Вам здоровья, душевного тепла, уважения и настоящей радости от результатов детей." },
      { id: "teacher-message-15", authorName: "Сергей", authorRole: "папа Максима", message: "Анна Сергеевна, со Всемирным днём учителя! Благодарим за Ваше терпение, требовательность и поддержку. Пусть трудные задачи решаются легче, родители помогают, а ученики всё чаще радуют Вас взрослыми поступками." },
      { id: "teacher-message-16", authorName: "Ирина", authorRole: "мама Лизы", message: "Спасибо Вам за то, что школа для наших детей — это не только оценки и задания, но и место, где их слышат и поддерживают. Со Всемирным днём учителя! Желаем Вам энергии, спокойствия и благодарных учеников." },
      { id: "teacher-message-17", authorName: "Родители 7 «Б»", message: "Анна Сергеевна, от всего нашего класса поздравляем Вас со Всемирным днём учителя! Спасибо за терпение, справедливость и заботу о детях. Пусть учебный год будет спокойным, успешным и богатым на хорошие события." },
      { id: "teacher-message-18", authorName: "Мария", authorRole: "мама Артёма", message: "Со Всемирным днём учителя! Спасибо Вам за уважительное отношение к детям и умение говорить с ними так, чтобы они действительно слышали. Желаем Вам вдохновения, профессиональных успехов и времени на любимые дела." },
      { id: "teacher-message-19", authorName: "Анастасия", authorRole: "выпускница 2023 года", message: "Анна Сергеевна, со Всемирным днём учителя! Прошло уже несколько лет, а я до сих пор вспоминаю Ваши уроки и советы. Спасибо за веру в нас и требовательность, которую мы научились ценить уже после школы." },
      { id: "teacher-message-20", authorName: "Михаил", authorRole: "выпускник 2021 года", message: "Поздравляю Вас со Всемирным днём учителя! Многие вещи, которым Вы нас учили, оказались важнее оценок и контрольных. Спасибо за честность, поддержку и умение вдохновлять. Желаю Вам новых сильных и дружных классов." }
    ],
    quoteCandidates: [
      { id: "teacher-quote-1", text: "С Вами хочется стараться." },
      { id: "teacher-quote-2", text: "Вы всегда замечаете, когда кому-то нужна помощь." },
      { id: "teacher-quote-3", text: "Многие вещи, которым Вы нас учили, оказались важнее оценок и контрольных." }
    ],
    organizerQuoteIds: ["teacher-quote-1", "teacher-quote-2", "teacher-quote-3"],
    recipientQuoteIds: ["teacher-quote-1", "teacher-quote-2", "teacher-quote-3"],
    photos: [
      { id: "teacher-photo-portrait", src: "/examples/school-classic/teacher-portrait.png", width: 1024, height: 1536, caption: "С Вами хочется узнавать больше", crop: { x: 0.5, y: 0.46, zoom: 1 } },
      { id: "teacher-photo-lesson", src: "/examples/school-classic/lesson.png", width: 1536, height: 1024, caption: "Когда сложное становится понятным", crop: { x: 0.5, y: 0.48, zoom: 1 } },
      { id: "teacher-photo-year", src: "/examples/school-classic/school-year.png", width: 1536, height: 1024, caption: "Начало ещё одной общей истории", crop: { x: 0.5, y: 0.48, zoom: 1 } },
      { id: "teacher-photo-class", src: "/examples/school-classic/class-together.png", width: 1536, height: 1024, caption: "Те, ради кого всё это", crop: { x: 0.5, y: 0.48, zoom: 1 } }
    ],
    memoryPhotoIds: ["teacher-photo-lesson", "teacher-photo-year", "teacher-photo-class"],
    memoryTitle: "Моменты, которые хочется сохранить",
    memoryDescription: "Уроки, школьные праздники и тёплые минуты рядом с классом."
  },
  "text-stress": {
    id: "text-stress",
    label: "Предельные тексты",
    description: "Граничные длины имени, главного поздравления, фразы и подписи фотографии.",
    ...baseFixture,
    recipientName: "Екатерина-Александра Константиновна-Светлова",
    mainGreeting: exactLength("Это главное поздравление проверяет полный вывод пятисот символов без многоточия и внутренней прокрутки.", 500),
    qualities: [
      exactLength("невероятная отзывчивость", 28),
      exactLength("бережная внимательность", 28),
      exactLength("спокойная уверенность", 28),
      exactLength("искреннее вдохновение", 28),
      exactLength("доброе чувство юмора", 28)
    ],
    quoteCandidates: stressQuoteCandidates,
    photos: textStressPhotos
  },
  minimal: {
    id: "minimal",
    label: "Минимальный состав",
    description: "Только обязательные данные private-открытки, без необязательных блоков.",
    recipientName: "Лена",
    occasion: "Важный день",
    eventDate: null,
    fromLabel: "от близких",
    mainGreeting: "Мы рядом и хотим сказать тебе самые важные слова.",
    privateSignature: "От близких.",
    qualities: [],
    contributions: [contributions[0]],
    quoteCandidates: [],
    organizerQuoteIds: [],
    recipientQuoteIds: [],
    photos: [],
    memoryPhotoIds: [],
    memoryTitle: "Моменты",
    memoryDescription: ""
  },
  "public-full": {
    id: "public-full",
    label: "Публичная — полный состав",
    description: "Максимально разрешённые публичные блоки и ровно три опубликованные фотографии.",
    ...baseFixture,
    photos: photos.slice(0, 3),
    memoryPhotoIds: ["photo-1", "photo-2", "photo-3"]
  },
  "public-no-photos": {
    id: "public-no-photos",
    label: "Публичная — без фото",
    description: "Публичная версия без фотографий и блока «Моменты».",
    ...baseFixture,
    photos: [],
    memoryPhotoIds: []
  },
  "photo-crop-stress": {
    id: "photo-crop-stress",
    label: "Кадрирование",
    description: "Разные пропорции фотографий и крайние нормализованные точки кадрирования.",
    ...baseFixture,
    photos: textStressPhotos.map((photo, index) => ({
      ...photo,
      crop: index % 3 === 0
        ? { x: 0, y: 0, zoom: 3 }
        : index % 3 === 1
          ? { x: 1, y: 1, zoom: 3 }
          : { x: 0.5, y: 0.5, zoom: 1 }
    }))
  }
};

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const validateUniversalTemplateFixture = (
  fixture: UniversalTemplateFixture
): UniversalFixtureValidationIssue[] => {
  const issues: UniversalFixtureValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  if (fixture.recipientName.trim().length === 0 || fixture.recipientName.length > 80) {
    add("recipientName", "Имя должно содержать от 1 до 80 символов.");
  }
  if (fixture.occasion.trim().length === 0 || fixture.occasion.length > 60) {
    add("occasion", "Повод должен содержать от 1 до 60 символов.");
  }
  if (fixture.eventDate !== null && !isIsoDate(fixture.eventDate)) {
    add("eventDate", "Дата события должна быть корректной ISO-датой YYYY-MM-DD.");
  }
  if (fixture.mainGreeting.trim().length === 0 || fixture.mainGreeting.length > 500) {
    add("mainGreeting", "Главное поздравление должно содержать от 1 до 500 символов.");
  }
  if (fixture.privateSignature.length > 180) {
    add("privateSignature", "Подпись private-открытки не должна превышать 180 символов.");
  }
  if (fixture.qualities.length !== 0 && fixture.qualities.length !== 5) {
    add("qualities", "Необязательный блок качеств должен содержать ровно 5 значений.");
  }
  fixture.qualities.forEach((quality, index) => {
    if (quality.trim().length === 0 || quality.length > 28) add(`qualities.${index}`, "Качество должно содержать от 1 до 28 символов.");
  });
  if (fixture.quoteCandidates.length !== 0 && (fixture.quoteCandidates.length < 3 || fixture.quoteCandidates.length > 6)) {
    add("quoteCandidates", "Набор лучших фраз должен содержать от 3 до 6 кандидатов.");
  }
  const quoteIds = new Set(fixture.quoteCandidates.map((quote) => quote.id));
  if (quoteIds.size !== fixture.quoteCandidates.length) add("quoteCandidates", "ID кандидатов лучших фраз должны быть уникальными.");
  fixture.quoteCandidates.forEach((quote, index) => {
    if (quote.text.trim().length === 0 || quote.text.length > 100) add(`quoteCandidates.${index}.text`, "Лучшая фраза должна содержать от 1 до 100 символов.");
  });
  for (const [path, selection] of [
    ["organizerQuoteIds", fixture.organizerQuoteIds],
    ["recipientQuoteIds", fixture.recipientQuoteIds]
  ] as const) {
    if (selection.length !== 0 && selection.length !== 3) add(path, "Выбор лучших фраз должен содержать ровно 3 ID.");
    if (new Set(selection).size !== selection.length) add(path, "Выбранные фразы не должны повторяться.");
    if (selection.some((id) => !quoteIds.has(id))) add(path, "Выбор содержит неизвестный ID кандидата.");
  }
  const photoIds = new Set(fixture.photos.map((photo) => photo.id));
  if (photoIds.size !== fixture.photos.length) add("photos", "ID фотографий должны быть уникальными.");
  fixture.photos.forEach((photo, index) => {
    if (photo.caption.length > 45 || photo.caption.includes("…")) add(`photos.${index}.caption`, "Подпись должна полностью помещаться в 45 символов без многоточия.");
    if (photo.width <= 0 || photo.height <= 0) add(`photos.${index}`, "Размеры фотографии должны быть положительными.");
    if (photo.crop.x < 0 || photo.crop.x > 1 || photo.crop.y < 0 || photo.crop.y > 1 || photo.crop.zoom < 1 || photo.crop.zoom > 3) {
      add(`photos.${index}.crop`, "Кадрирование должно быть нормализовано: x/y 0…1, zoom 1…3.");
    }
  });
  if (fixture.memoryPhotoIds.length !== 0 && fixture.memoryPhotoIds.length !== 3) {
    add("memoryPhotoIds", "Блок «Моменты» существует только для ровно трёх фотографий.");
  }
  if (new Set(fixture.memoryPhotoIds).size !== fixture.memoryPhotoIds.length) add("memoryPhotoIds", "Фотографии «Моментов» не должны повторяться.");
  if (fixture.memoryPhotoIds.some((id) => !photoIds.has(id))) add("memoryPhotoIds", "Блок «Моменты» содержит неизвестную фотографию.");
  if (fixture.memoryTitle.length > 80) add("memoryTitle", "Заголовок «Моментов» не должен превышать 80 символов.");
  if (fixture.memoryDescription.length > 180) add("memoryDescription", "Описание «Моментов» не должно превышать 180 символов.");

  return issues;
};

export const getUniversalTemplateFixture = (id: UniversalTemplateFixtureId) => universalTemplateFixtures[id];

for (const fixture of Object.values(universalTemplateFixtures)) {
  const issues = validateUniversalTemplateFixture(fixture);
  if (issues.length > 0) {
    const details = issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    throw new Error(`Невалидный fixture ${fixture.id}:\n${details}`);
  }
}
