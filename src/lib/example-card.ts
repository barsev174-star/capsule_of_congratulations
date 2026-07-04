import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";

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

const captions = [
  "Вечер, который хочется запомнить",
  "Маленький знак внимания",
  "Тёплая прогулка после встречи",
  "Когда всё собрано с любовью",
  "Самый сладкий момент",
  "Цветы, открытка и немного тепла"
];

const slotByPhoto = {
  1: "landscape-a",
  2: "memory-a",
  3: "landscape-b",
  4: "memory-b",
  5: "landscape-c",
  6: "memory-c"
} as const;

const mediaAssets: CardMediaAsset[] = captions.map((caption, index) => {
  const photoNumber = (index + 1) as keyof typeof slotByPhoto;

  return {
    id: `example-photo-${photoNumber}`,
    cardId: "example-kristina",
    slot: slotByPhoto[photoNumber],
    publicUrl: `/examples/kristina/${photoNumber}.jpg`,
    storagePath: `public/examples/kristina/${photoNumber}.jpg`,
    fileName: `${photoNumber}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 0,
    captionTitle: caption,
    captionSubtitle: caption,
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
  aiSummaryTitle: "",
  aiSummaryText: "",
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
