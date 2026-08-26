import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import { kristinaExamplePhotos } from "@/lib/kristina-example-photos";
import { buildUniversalFixtureViewModel, type UniversalTemplatePhoto, type UniversalTemplateViewModel } from "@/lib/templates/view-model";

const createdAt = "2026-07-03T00:00:00.000Z";

const contribution = (id: string, authorName: string, authorRole: string, message: string, sortOrder: number): Contribution => ({
  id,
  cardId: "example-kristina",
  authorName,
  authorRole,
  authorAvatarUrl: null,
  message,
  sortOrder,
  status: "visible",
  source: "manual",
  createdAt,
  updatedAt: createdAt
});

const slotByPhoto = {
  1: "landscape-a",
  2: "memory-a",
  3: "landscape-b",
  4: "memory-b",
  5: "landscape-c",
  6: "memory-c"
} as const;

const mediaAssets: CardMediaAsset[] = kristinaExamplePhotos.map((photo, index) => {
  const photoNumber = (index + 1) as keyof typeof slotByPhoto;

  return {
    id: `example-photo-${photoNumber}`,
    cardId: "example-kristina",
    slot: slotByPhoto[photoNumber],
    publicUrl: photo.src,
    storagePath: `public${photo.src}`,
    fileName: photo.src.split("/").pop()!,
    mimeType: "image/webp",
    sizeBytes: 0,
    captionTitle: photo.caption,
    captionSubtitle: photo.caption,
    createdAt,
    updatedAt: createdAt
  };
});

const contributions: Contribution[] = [
  contribution(
    "example-alexey",
    "Алексей",
    "коллега",
    "Кристина, с днём рождения! Спасибо за твою лёгкость и чувство юмора. С тобой даже самый обычный рабочий день становится теплее. Пусть будет больше поводов радоваться и меньше поводов переживать.",
    1
  ),
  contribution(
    "example-marina",
    "Марина",
    "подруга",
    "Крис, поздравляю! Очень ценю, что ты умеешь быть рядом не только в весёлые моменты, но и когда нужно просто выслушать. Желаю тебе много любви, спокойствия и дней, после которых хочется улыбаться.",
    2
  ),
  contribution(
    "example-igor",
    "Игорь",
    "друг",
    "Кристина, пусть этот год принесёт тебе больше свободы, красивых поездок и классных людей рядом. Ты правда умеешь заряжать окружающих, и это редкое качество.",
    3
  ),
  contribution(
    "example-olga",
    "Ольга",
    "коллега",
    "С днём рождения! Спасибо за внимательность, поддержку и умение находить добрые слова в нужный момент. Пусть всё, что ты задумала, получается спокойно и красиво.",
    4
  ),
  contribution(
    "example-nastya",
    "Настя",
    "подруга",
    "Кристина, обнимаю и поздравляю! Желаю тебе больше времени на себя, больше маленьких радостей и больших счастливых перемен. Ты очень тёплый человек.",
    5
  ),
  contribution(
    "example-dmitry",
    "Дмитрий",
    "коллега",
    "Кристина, желаю, чтобы рядом всегда были люди, которые ценят твою доброту, честность и энергию. Пусть в новом году жизни будет много хороших новостей.",
    6
  )
];

const mainGreeting = `Кристина, с днём рождения!

Мы собрали эту открытку, чтобы сказать тебе простые, но важные слова. С тобой легко смеяться, работать, придумывать новое и чувствовать, что рядом есть человек, который поддержит.

Ты умеешь создавать вокруг себя тепло — не громко, не напоказ, а очень по-настоящему. Спасибо за твою доброту, чувство юмора, внимание к людям и умение замечать хорошее даже в обычных днях.

Пусть впереди будет больше моментов, которые хочется сохранить: встреч, поездок, уютных вечеров, смелых планов и людей, рядом с которыми можно быть собой.`;

export const exampleCardModel: FinalCardViewModel = {
  style: "paper-birthday",
  recipientName: "Кристина",
  occasionLabel: "С днём рождения!",
  fromLabel: "от друзей и коллег",
  heroDescription: "Открытка от друзей и коллег: поздравления, фото, лучшие фразы и тёплое письмо в одном подарке.",
  participantCount: contributions.length,
  finalSlug: "example",
  summaryTitle: "Самые важные слова",
  summaryText: mainGreeting,
  mainGreetingContributionId: null,
  mainGreetingAuthorName: null,
  qualities: ["доброта", "чувство юмора", "поддержка", "внимание", "лёгкость", "тепло"],
  quotes: [
    "С тобой даже обычный день становится теплее.\n— Алексей",
    "Ты умеешь быть рядом, когда это правда важно.\n— Марина",
    "Ты заряжаешь окружающих — это редкое качество.\n— Игорь"
  ],
  contributions,
  memories: [],
  mediaAssets,
  messageMediaAssets: mediaAssets.filter((asset) => asset.slot.startsWith("landscape")),
  memoryMediaAssets: mediaAssets.filter((asset) => asset.slot.startsWith("memory")),
  memoryTitle: "Моменты",
  memoryDescription: "Фото, которые хочется сохранить",
  memoryPhotoCount: 3,
  messageLayoutMode: "column-media",
  messageMediaLayout: "landscape-trio",
  showAllMessagesLink: false,
  footerSignature: "Кристина, пусть эта открытка останется маленьким напоминанием: тебя любят, ценят и очень рады, что ты есть рядом.\n\nС днём рождения!",
  blocks: [
    { id: "hero", required: true },
    { id: "summary", required: true },
    { id: "qualities", required: false },
    { id: "messages", required: true },
    { id: "memories", required: false },
    { id: "quotes", required: false },
    { id: "closing", required: true }
  ]
};

export const schoolScrapbookDemoCardModel: UniversalTemplateViewModel = (() => {
  const photo = (
    id: string,
    fileName: string,
    width: number,
    height: number,
    caption: string
  ): UniversalTemplatePhoto => ({
    id: `example-alisa-${id}`,
    src: `/examples/alisa-school/${fileName}`,
    width,
    height,
    caption,
    crop: { x: 0.5, y: 0.5, zoom: 1 },
    alt: `Фотография для открытки Алиса`
  });

  const messagePhotos: UniversalTemplatePhoto[] = [
    photo("portrait", "alice-portrait.webp", 1086, 1448, "Первое сентября — начало новых открытий")
  ];

  const memoryPhotos: UniversalTemplatePhoto[] = [
    photo("friends", "alice-friends.webp", 1489, 1056, "Друзья рядом — и всё становится веселее"),
    photo("parents-school", "alice-parents-school.webp", 1448, 1086, "Первый школьный день, который хочется запомнить"),
    photo("family-home", "alice-family-home.webp", 1448, 1086, "Утро, полное волнения и улыбок")
  ];

  const mainGreeting = "Алиса, поздравляем тебя с Днём знаний! Начинается новый учебный год — ещё одна маленькая глава твоей большой истории. Желаем тебе идти в школу с интересом, не бояться задавать вопросы, пробовать новое и радоваться своим успехам. Пусть рядом будут добрые учителя и настоящие друзья, уроки приносят открытия, а перемены — весёлые истории. Оставайся такой же любознательной, доброй, смелой и удивительно светлой. Мы всегда рядом, всегда поддержим и очень тобой гордимся.";

  return {
    templateId: "school-scrapbook",
    recipientName: "Алиса",
    occasion: "1 сентября",
    eventDate: "2026-09-01",
    fromLabel: "от семьи",
    heroDescription: "Тёплые слова, яркие моменты и пожелания специально для тебя.",
    participantCount: 9,
    publicPhotoCount: null,
    summaryTitle: "Главное поздравление",
    mainGreeting,
    mainGreetingAuthorName: "Мама и папа · родители",
    qualities: ["доброта", "любознательность", "старание", "дружелюбие", "смелость"],
    contributions: [
      { id: "example-alisa-main", authorName: "Мама и папа", authorRole: "родители", message: mainGreeting },
      { id: "example-alisa-babushka-lida", authorName: "Бабушка Лида", authorRole: "бабушка", message: "Алисочка, с 1 сентября! Желаю тебе с удовольствием узнавать новое, радоваться своим успехам и каждое утро идти в школу с хорошим настроением. Пусть рядом всегда будут добрые люди и верные друзья." },
      { id: "example-alisa-dedushka-viktor", authorName: "Дедушка Виктор", authorRole: "дедушка", message: "Алиса, с Днём знаний! Желаю тебе смелости перед сложными задачами, терпения и настоящего любопытства. Не бойся ошибаться — именно так появляются знания и большие победы!" },
      { id: "example-alisa-tetya-olya", authorName: "Тётя Оля", authorRole: "тётя", message: "Алиса, поздравляю с началом учебного года! Пусть в твоих тетрадях будет много пятёрок, а в каждом дне — ещё больше улыбок, интересных событий и весёлых перемен." },
      { id: "example-alisa-dyadya-sasha", authorName: "Дядя Саша", authorRole: "дядя", message: "С 1 сентября, Алиса! Желаю тебе находить ответы на самые сложные вопросы, открывать новые увлечения и всегда верить в себя. Пусть учёба будет настоящим приключением!" },
      { id: "example-alisa-babushka-natasha", authorName: "Бабушка Наташа", authorRole: "бабушка", message: "Моя дорогая Алиса, пусть этот школьный год будет добрым и счастливым. Желаю тебе хороших учителей, замечательных друзей и много поводов возвращаться домой с улыбкой." },
      { id: "example-alisa-dedushka-nikolay", authorName: "Дедушка Николай", authorRole: "дедушка", message: "Алиса, поздравляю тебя с Днём знаний! Желаю быть внимательной, настойчивой и никогда не терять интереса к новому. Пусть каждый день приносит тебе хотя бы одно маленькое открытие." },
      { id: "example-alisa-tetya-lena", authorName: "Тётя Лена", authorRole: "тётя", message: "Алисочка, с новым школьным годом! Пусть у тебя всё получается, новые знания даются легко, а школа дарит не только уроки, но и много тёплых воспоминаний." },
      { id: "example-alisa-dyadya-andrey", authorName: "Дядя Андрей", authorRole: "дядя", message: "Алиса, с праздником! Желаю тебе отличного настроения, интересных предметов и друзей, с которыми весело и на уроках, и на переменах. Пусть этот год получится ярким!" }
    ],
    messageScenario: "portrait",
    messagePhotos,
    memoryTitle: "Моменты, которые хочется сохранить",
    memoryDescription: "Первый школьный день, семья и друзья — моменты, к которым хочется возвращаться.",
    memoryPhotos,
    privateQuotes: [
      "Пусть каждый школьный день приносит тебе новое маленькое открытие.",
      "Не бойся ошибаться — самые интересные победы начинаются с попытки.",
      "Пусть рядом будут люди, с которыми интересно учиться, дружить и мечтать."
    ],
    publicQuotes: [],
    privateSignature: "С любовью и верой в тебя — твоя семья."
  };
})();

export const schoolClassicDemoCardModel: UniversalTemplateViewModel = buildUniversalFixtureViewModel("teacher-classic", {
  templateId: "school-classic",
  scenario: "portrait",
  photoCount: 1
});

export const kindergartenDoodlesDemoCardModel: UniversalTemplateViewModel = buildUniversalFixtureViewModel("kindergarten-demo", {
  templateId: "kindergarten-doodles",
  scenario: "landscape-pair",
  photoCount: 2
});

export const teamEditorialDemoCardModel: UniversalTemplateViewModel = buildUniversalFixtureViewModel("team-editorial-demo", {
  templateId: "team-editorial",
  scenario: "landscape-trio",
  photoCount: 3
});

const routeContributions: Contribution[] = [
  contribution(
    "route-ivan",
    "Иван",
    "друг",
    "Лёша, с днём рождения! Спасибо за надёжность, за смех и за то, что ты всегда за движ. Пусть впереди будет ещё больше крутых маршрутов и побед!",
    1
  ),
  contribution(
    "route-mikhail",
    "Михаил",
    "друг",
    "Брат, ты пример настоящего мужика. Умеешь мечтать, вдохновлять и делать этот мир лучше. Удачи во всех делах и новых высот!",
    2
  ),
  contribution(
    "route-artem",
    "Артём",
    "друг",
    "С днём рождения, Лёха! Пусть будет больше поводов для гордости, меньше преград и максимум приключений. Горжусь нашей дружбой.",
    3
  ),
  contribution(
    "route-denis",
    "Денис",
    "друг",
    "Спасибо, что ты рядом. За твою надёжность, чувство юмора и умение найти выход даже из безвыходной ситуации. Так держать!",
    4
  ),
  contribution(
    "route-sergey",
    "Сергей",
    "друг",
    "Лёша, ты умеешь вдохновлять примером — спокойно, без лишних слов. Желаю не терять этот характер, веру в себя и вкус к жизни.",
    5
  ),
  contribution(
    "route-egor",
    "Егор",
    "друг",
    "С днём рождения! Пусть в твоей жизни будет больше свободы, сильных идей, удачных дорог и людей, с которыми хочется делить победы.",
    6
  ),
  contribution(
    "route-andrey",
    "Андрей",
    "друг",
    "Лёша, с днём рождения! Желаю тебе не терять любопытства к жизни, смело браться за новые дела и всегда находить время для людей, с которыми по-настоящему хорошо. Пусть впереди будет много поводов собраться вместе и вспомнить этот год с улыбкой.",
    7
  ),
  contribution(
    "route-pavel",
    "Павел",
    "коллега",
    "Алексей, поздравляю! Ценю твоё спокойствие, ответственность и умение находить решение даже тогда, когда задача кажется безнадёжной. Желаю сильных проектов, заслуженных результатов и побольше времени на всё, что действительно вдохновляет.",
    8
  ),
  contribution(
    "route-roman",
    "Роман",
    "друг",
    "Лёха, оставайся таким же открытым, надёжным и настоящим. С тобой легко отправиться в любую поездку, начать новое дело или просто провести хороший вечер. Желаю здоровья, энергии и маршрутов, которые обязательно приведут к чему-то важному.",
    9
  ),
  contribution(
    "route-kirill",
    "Кирилл",
    "друг",
    "С днём рождения! Пусть в жизни будет больше уверенных решений, интересных встреч и моментов, когда понимаешь, что всё складывается правильно. Желаю, чтобы рядом оставались проверенные люди, а впереди всегда была цель, к которой хочется идти.",
    10
  ),
  contribution(
    "route-maxim",
    "Максим",
    "друг",
    "Лёша, спасибо за твоё чувство юмора, честность и умение поддержать без лишних слов. Желаю, чтобы сил хватало не только на работу и важные задачи, но и на путешествия, встречи, новые впечатления и большие планы, которые давно ждут своего часа.",
    11
  ),
  contribution(
    "route-oleg",
    "Олег",
    "коллега",
    "Алексей, желаю тебе сохранять внутреннее спокойствие, верить в свои идеи и не останавливаться после первых побед. Пусть работа приносит удовлетворение, люди рядом отвечают взаимностью, а каждый новый год открывает больше возможностей, чем предыдущий.",
    12
  )
];

const routeCaptions = [
  "На вершине — вместе",
  "Лучшие вечера у костра",
  "Футбол, который объединяет",
  "Новые точки на карте",
  "Идём дальше",
  "Твой маршрут — твоя история"
];

const routeMediaAssets: CardMediaAsset[] = routeCaptions.map((caption, index) => {
  const photoNumber = (index + 1) as keyof typeof slotByPhoto;

  return {
    id: `route-photo-${photoNumber}`,
    cardId: "example-route",
    slot: slotByPhoto[photoNumber],
    publicUrl: `/examples/route/${photoNumber}.png`,
    storagePath: `public/examples/route/${photoNumber}.png`,
    fileName: `${photoNumber}.png`,
    mimeType: "image/png",
    sizeBytes: 0,
    captionTitle: caption,
    captionSubtitle: caption,
    createdAt,
    updatedAt: createdAt
  };
});

export const routeAdventureDemoCardModel: FinalCardViewModel = {
  style: "route-adventure",
  recipientName: "Алексей",
  occasionLabel: "С днём рождения!",
  fromLabel: "от друзей",
  heroDescription: "Эту открытку для тебя собрали друзья —\nс тёплыми словами, важными моментами и личными пожеланиями.",
  participantCount: routeContributions.length,
  finalSlug: "example-route",
  summaryTitle: "Главное о тебе",
  summaryText:
    "Лёша — человек, на которого можно положиться. Он умеет поддержать, спокойно разобраться в сложной ситуации и вернуть уверенность, когда она особенно нужна.\n\nДрузья ценят его за честность, энергию и умение превращать обычные планы в настоящие истории.",
  mainGreetingContributionId: null,
  mainGreetingAuthorName: null,
  qualities: ["надёжный", "искренний", "сильный", "свой человек", "вдохновляющий"],
  quotes: [
    "Важно не то, насколько лёгкий путь, а с кем ты его проходишь.",
    "Рядом с тобой даже сложные подъёмы становятся по силам.",
    "Настоящая опора — это человек, рядом с которым спокойно идти дальше."
  ],
  contributions: routeContributions,
  memories: [],
  mediaAssets: routeMediaAssets,
  messageMediaAssets: routeMediaAssets.filter((asset) => asset.slot.startsWith("landscape")),
  memoryMediaAssets: routeMediaAssets.filter((asset) => asset.slot.startsWith("memory")),
  memoryTitle: "Моменты",
  memoryDescription: "Фото, которые хочется сохранить",
  memoryPhotoCount: 3,
  messageLayoutMode: "column-media",
  messageMediaLayout: "landscape-trio",
  showAllMessagesLink: false,
  footerSignature: "Спасибо всем, кто был рядом на этом маршруте.",
  blocks: [
    { id: "hero", required: true },
    { id: "summary", required: true },
    { id: "qualities", required: false },
    { id: "messages", required: true },
    { id: "memories", required: false },
    { id: "quotes", required: false },
    { id: "closing", required: true }
  ]
};
