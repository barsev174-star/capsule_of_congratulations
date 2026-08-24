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
    occasion: "День учителя",
    eventDate: "2026-10-05",
    fromLabel: "от учеников и родителей",
    heroDescription: "Слова благодарности, школьные моменты и пожелания специально для Вас.",
    summaryTitle: "Главное поздравление",
    mainGreetingAuthorName: "Ученики и родители",
    mainGreeting:
      "Анна Сергеевна, поздравляем Вас с Днём учителя! Спасибо за знания, терпение и ту особую атмосферу, в которой детям не страшно задавать вопросы, ошибаться и пробовать снова. Вы умеете замечать сильные стороны каждого, поддерживать в нужный момент и вдохновлять двигаться дальше. Пусть Ваша работа приносит радость и гордость за учеников, рядом будут благодарные дети и родители, а в жизни всегда остаётся время для себя, семьи, мечтаний и счастливых событий.",
    privateSignature: "С теплом и благодарностью — ученики, родители и выпускники.",
    qualities: ["внимательная", "справедливая", "терпеливая", "вдохновляющая", "мудрая"],
    contributions: [
      { id: "teacher-message-1", authorName: "Маша", authorRole: "ученица", message: "Анна Сергеевна, с Днём учителя! Спасибо, что на Ваших уроках всегда интересно и не страшно ошибаться. Желаю Вам побольше радостных дней, добрых учеников и отличного настроения!" },
      { id: "teacher-message-2", authorName: "Илья", authorRole: "ученик", message: "Поздравляю Вас с Днём учителя! Спасибо за терпение, чувство юмора и за то, что умеете объяснить даже самое сложное. Пусть ученики радуют успехами, а каждый школьный день приносит что-то хорошее." },
      { id: "teacher-message-3", authorName: "Софья", authorRole: "ученица", message: "Анна Сергеевна, спасибо Вам за поддержку и за то, что Вы всегда замечаете, когда кому-то нужна помощь. С Днём учителя! Желаю Вам вдохновения, лёгких уроков и много поводов улыбаться." },
      { id: "teacher-message-4", authorName: "Артём", authorRole: "ученик", message: "С Днём учителя, Анна Сергеевна! Желаю, чтобы в классе чаще звучали правильные ответы, реже забывались домашние задания, а у Вас всегда оставались силы, терпение и хорошее настроение." },
      { id: "teacher-message-5", authorName: "Полина", authorRole: "ученица", message: "Анна Сергеевна, поздравляю с Днём учителя! Спасибо, что верите в нас даже тогда, когда мы сами сомневаемся. Желаю Вам добрых людей рядом, интересных идей и учеников, которыми можно гордиться." },
      { id: "teacher-message-6", authorName: "Максим", authorRole: "ученик", message: "Спасибо Вам за то, что умеете сделать обычный урок интересным и всегда объясняете ещё раз, если что-то не получилось понять. С Днём учителя! Желаю Вам радости, здоровья и отличных классов." },
      { id: "teacher-message-7", authorName: "Лиза", authorRole: "ученица", message: "Анна Сергеевна, с Днём учителя! Пусть у Вас будет больше спокойных уроков, приятных сюрпризов и ученических побед. Спасибо за доброту, справедливость и за то, что с Вами хочется стараться." },
      { id: "teacher-message-8", authorName: "Даниил", authorRole: "ученик", message: "Поздравляю с Днём учителя! Спасибо Вам за знания и за то, что никогда не смеётесь над нашими ошибками, а помогаете разобраться. Желаю Вам терпения, вдохновения и много счастливых дней вне школы." },
      { id: "teacher-message-9", authorName: "Вика", authorRole: "ученица", message: "Анна Сергеевна, спасибо, что умеете быть и строгой, и доброй именно тогда, когда это нужно. С Днём учителя! Пусть работа приносит удовольствие, а ученики чаще удивляют Вас хорошими результатами." },
      { id: "teacher-message-10", authorName: "Кирилл", authorRole: "ученик", message: "С Днём учителя! Желаю Вам как можно меньше проверять исправлений и как можно чаще ставить пятёрки. Спасибо за Ваше терпение, понятные объяснения и за то, что всегда можно обратиться с вопросом." },
      { id: "teacher-message-11", authorName: "Екатерина", authorRole: "мама Маши", message: "Анна Сергеевна, поздравляем Вас с Днём учителя! Спасибо за внимание к детям, терпение и искреннюю вовлечённость. Пусть Ваш труд возвращается уважением, успехами учеников и благодарностью семей." },
      { id: "teacher-message-12", authorName: "Алексей", authorRole: "папа Ильи", message: "С Днём учителя, Анна Сергеевна! Спасибо за умение не только давать знания, но и поддерживать детей, учить их самостоятельности и ответственности. Желаем Вам сил, вдохновения и спокойных учебных дней." },
      { id: "teacher-message-13", authorName: "Ольга", authorRole: "мама Софьи", message: "Анна Сергеевна, благодарим Вас за заботу, мудрость и атмосферу доверия в классе. С Днём учителя! Пусть рядом будут понимающие родители, любознательные дети и много поводов гордиться своей работой." },
      { id: "teacher-message-14", authorName: "Наталья", authorRole: "мама Полины", message: "Поздравляем Вас с Днём учителя! Спасибо, что видите в каждом ребёнке личность и помогаете раскрывать сильные стороны. Желаем Вам здоровья, душевного тепла, уважения и настоящей радости от результатов детей." },
      { id: "teacher-message-15", authorName: "Сергей", authorRole: "папа Максима", message: "Анна Сергеевна, с Днём учителя! Благодарим за Ваше терпение, требовательность и поддержку. Пусть трудные задачи решаются легче, родители помогают, а ученики всё чаще радуют Вас взрослыми поступками." },
      { id: "teacher-message-16", authorName: "Ирина", authorRole: "мама Лизы", message: "Спасибо Вам за то, что школа для наших детей — это не только оценки и задания, но и место, где их слышат и поддерживают. С Днём учителя! Желаем Вам энергии, спокойствия и благодарных учеников." },
      { id: "teacher-message-17", authorName: "Родители 7 «Б»", message: "Анна Сергеевна, от всего нашего класса поздравляем Вас с Днём учителя! Спасибо за терпение, справедливость и заботу о детях. Пусть учебный год будет спокойным, успешным и богатым на хорошие события." },
      { id: "teacher-message-18", authorName: "Мария", authorRole: "мама Артёма", message: "С Днём учителя! Спасибо Вам за уважительное отношение к детям и умение говорить с ними так, чтобы они действительно слышали. Желаем Вам вдохновения, профессиональных успехов и времени на любимые дела." },
      { id: "teacher-message-19", authorName: "Анастасия", authorRole: "выпускница 2023 года", message: "Анна Сергеевна, с Днём учителя! Прошло уже несколько лет, а я до сих пор вспоминаю Ваши уроки и советы. Спасибо за веру в нас и требовательность, которую мы научились ценить уже после школы." },
      { id: "teacher-message-20", authorName: "Михаил", authorRole: "выпускник 2021 года", message: "Поздравляю Вас с Днём учителя! Многие вещи, которым Вы нас учили, оказались важнее оценок и контрольных. Спасибо за честность, поддержку и умение вдохновлять. Желаю Вам новых сильных и дружных классов." }
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
  "kindergarten-demo": {
    id: "kindergarten-demo",
    label: "Воспитателю — детские рисунки",
    description: "Елизавета Степановна, 15 поздравлений, 5 качеств, 3 лучшие фразы, 2 горизонтальных фото и 3 отдельных момента.",
    recipientName: "Елизавета Степановна",
    occasion: "День воспитателя",
    eventDate: "2026-09-27",
    fromLabel: "от детей, родителей и коллег",
    heroDescription: "Добрые слова, детские улыбки и тёплые моменты специально для Вас.",
    summaryTitle: "Главное поздравление",
    mainGreetingAuthorName: "Родительский комитет",
    mainGreeting: "Елизавета Степановна, поздравляем Вас с Днём воспитателя! От всей души благодарим за тепло, заботу, терпение и внимание, с которыми Вы встречаете наших детей каждый день. Для малышей Вы — человек, рядом с которым спокойно, интересно и радостно, а для родителей — огромная поддержка и уверенность. Спасибо за Вашу ласку, умение видеть каждого, за маленькие открытия, важные шаги и счастливые детские улыбки. Желаем Вам здоровья, душевных сил, вдохновения и как можно больше светлых дней!",
    privateSignature: "С любовью и благодарностью — дети, родители и коллеги.",
    qualities: ["добрая", "заботливая", "терпеливая", "вдохновляющая", "мудрая"],
    contributions: [
      { id: "kindergarten-message-1", authorName: "Мария", authorRole: "мама Сони", message: "Елизавета Степановна, спасибо Вам за доброе сердце и заботу о наших детях! С Вами группа стала для Сони местом, куда она идёт с радостью. Желаем Вам здоровья, вдохновения и самых счастливых дней!" },
      { id: "kindergarten-message-2", authorName: "Илья", authorRole: "папа Димы", message: "Поздравляем Вас с Днём воспитателя! Спасибо за терпение, внимание и умение находить подход к каждому ребёнку. Дима с удовольствием рассказывает о днях в садике, и это для нас самая лучшая оценка Вашего труда." },
      { id: "kindergarten-message-3", authorName: "София", authorRole: "мама Лизы", message: "Елизавета Степановна, благодарим Вас за ласку, поддержку и ту атмосферу тепла, которую Вы создаёте в группе. Пусть работа приносит радость, дети радуют своими успехами, а в жизни будет много поводов для улыбки." },
      { id: "kindergarten-message-4", authorName: "Оксана", authorRole: "мама Артёма", message: "Спасибо Вам за Вашу доброту и искреннюю любовь к детям. Благодаря Вам Артём стал увереннее, охотнее общается и с интересом идёт в сад. Желаем Вам сил, здоровья, душевного тепла и радости каждый день." },
      { id: "kindergarten-message-5", authorName: "Екатерина", authorRole: "мама Миши", message: "С Днём воспитателя, Елизавета Степановна! Спасибо за терпение, внимание к каждому малышу и умение превратить обычный день в маленькое приключение. Пусть рядом будут благодарные родители, добрые дети и поддержка коллег." },
      { id: "kindergarten-message-6", authorName: "Павел", authorRole: "папа Насти", message: "Елизавета Степановна, благодарим Вас за заботу, спокойствие и уверенность, которые Вы дарите детям и родителям. Желаем Вам вдохновения, крепкого здоровья, тёплой атмосферы в группе и множества счастливых моментов." },
      { id: "kindergarten-message-7", authorName: "Алина", authorRole: "мама Кирилла", message: "Спасибо Вам за чуткость, доброту и терпение. С Вами дети учатся дружить, делиться, открывать новое и радоваться каждому дню. Пусть Ваша работа всегда приносит радость, а в доме царят уют и любовь." },
      { id: "kindergarten-message-8", authorName: "Татьяна", authorRole: "мама Полины", message: "Поздравляем Вас с Днём воспитателя! Благодарим за душевное тепло, поддержку и внимание, с которыми Вы относитесь к нашим детям. Желаем Вам лёгких дней, благодарных семей и как можно больше радостных улыбок вокруг." },
      { id: "kindergarten-message-9", authorName: "Сергей", authorRole: "папа Вики", message: "Елизавета Степановна, спасибо Вам за умение замечать каждого ребёнка, поддерживать и помогать. Вика идёт в группу с хорошим настроением, и это говорит о многом. Желаем Вам счастья, сил, вдохновения и добрых людей рядом." },
      { id: "kindergarten-message-10", authorName: "Родители группы «Солнышко»", message: "От всей души поздравляем Вас с Днём воспитателя! Спасибо за Ваше большое сердце, заботу и труд. Пусть каждый день приносит радость, дети отвечают любовью, а работа дарит ощущение важности и настоящего смысла." },
      { id: "kindergarten-message-11", authorName: "Ольга Николаевна", authorRole: "воспитатель соседней группы", message: "Елизавета Степановна, поздравляю Вас с Днём воспитателя! Вы умеете сочетать доброту, спокойствие и профессионализм, а рядом с Вами детям действительно хорошо. Желаю Вам вдохновения, сил и радости от каждого дня." },
      { id: "kindergarten-message-12", authorName: "Елена Викторовна", authorRole: "музыкальный руководитель", message: "С праздником, Елизавета Степановна! Спасибо за открытость, тёплое отношение к детям и лёгкость в совместной работе. Пусть идеи легко воплощаются, малыши радуют своими успехами, а работа приносит удовольствие и улыбки." },
      { id: "kindergarten-message-13", authorName: "Ирина Сергеевна", authorRole: "логопед", message: "Елизавета Степановна, поздравляю Вас с Днём воспитателя! Вы очень внимательный, терпеливый и душевный человек, рядом с которым детям спокойно и интересно. Желаю Вам здоровья, вдохновения и настоящей радости от профессии." },
      { id: "kindergarten-message-14", authorName: "Наталья Петровна", authorRole: "заведующая", message: "Елизавета Степановна, благодарю Вас за ответственность, доброту и любовь к детям. Вы создаёте в группе тёплую и надёжную атмосферу, которую очень ценят и дети, и родители. Желаю Вам благополучия, сил и профессиональных успехов." },
      { id: "kindergarten-message-15", authorName: "Светлана Андреевна", authorRole: "помощник воспитателя", message: "С Днём воспитателя, Елизавета Степановна! Спасибо за Вашу отзывчивость, поддержку и искреннюю заботу о каждом малыше. Пусть работа всегда вдохновляет, рядом будут хорошие люди, а каждый день приносит что-то светлое и доброе." }
    ],
    quoteCandidates: [
      { id: "kindergarten-quote-1", text: "С Вами группа стала местом, куда дети идут с радостью." },
      { id: "kindergarten-quote-2", text: "Вы умеете превратить обычный день в маленькое приключение." },
      { id: "kindergarten-quote-3", text: "Рядом с Вами детям спокойно, интересно и по-настоящему хорошо." }
    ],
    organizerQuoteIds: ["kindergarten-quote-1", "kindergarten-quote-2", "kindergarten-quote-3"],
    recipientQuoteIds: ["kindergarten-quote-1", "kindergarten-quote-2", "kindergarten-quote-3"],
    photos: [
      { id: "kindergarten-photo-creative-care", src: "/examples/kindergarten-doodles/creative-care-v2.png", width: 1536, height: 1024, caption: "Там, где творчество начинается с заботы", crop: { x: 0.5, y: 0.5, zoom: 1 } },
      { id: "kindergarten-photo-kind-stories", src: "/examples/kindergarten-doodles/kind-stories-v2.png", width: 1536, height: 1024, caption: "Сказки, рядом с которыми растут добрее", crop: { x: 0.5, y: 0.5, zoom: 1 } },
      { id: "kindergarten-photo-create-together", src: "/examples/kindergarten-doodles/create-together-v2.png", width: 1536, height: 1024, caption: "Творим, фантазируем, открываем новое", crop: { x: 0.5, y: 0.5, zoom: 1 } },
      { id: "kindergarten-photo-small-discoveries", src: "/examples/kindergarten-doodles/small-discoveries-v2.png", width: 1536, height: 1024, caption: "Маленькие открытия каждый день", crop: { x: 0.5, y: 0.5, zoom: 1 } },
      { id: "kindergarten-photo-friendly-group", src: "/examples/kindergarten-doodles/friendly-group-v2.png", width: 1536, height: 1024, caption: "Мы — одна большая дружная группа", crop: { x: 0.5, y: 0.5, zoom: 1 } }
    ],
    memoryPhotoIds: ["kindergarten-photo-create-together", "kindergarten-photo-small-discoveries", "kindergarten-photo-friendly-group"],
    memoryTitle: "Моменты, которые хочется сохранить",
    memoryDescription: "Весёлые будни, маленькие открытия и тёплые минуты нашей группы."
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
