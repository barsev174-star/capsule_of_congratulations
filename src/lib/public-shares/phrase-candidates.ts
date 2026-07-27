const fallbackPhrases = [
  "Эта открытка собрана с теплом и большой благодарностью.",
  "Рядом с тобой обычные дни становятся немного светлее.",
  "В этих словах — много заботы, внимания и искренней радости.",
  "Пусть это тёплое напоминание останется с тобой надолго.",
  "Тебя ценят за то, каким светлым становится всё рядом.",
  "В этой открытке — искреннее спасибо за тебя."
];

export const buildPublicPhraseCandidates = (qualities: string[]) => {
  const [first = "тепло", second = "внимание", third = "поддержку"] = qualities.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const tailored = [
    `Тебя особенно ценят за ${first}, ${second} и ${third}.`,
    `Твои ${first} и ${second} делают обычные дни светлее.`,
    `Рядом с тобой чувствуется ${first}, ${second} и настоящая забота.`
  ];
  return [...tailored, ...fallbackPhrases].slice(0, 6);
};
