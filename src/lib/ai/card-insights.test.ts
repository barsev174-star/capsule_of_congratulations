import {
  buildContributionFingerprint,
  buildMockBestQuotes,
  buildMockQualities,
  validateBestQuoteCandidates,
  validateQualityCandidates
} from "@/lib/ai/card-insights";
import type { Contribution } from "@/lib/cards/types";

const contributions: Contribution[] = [
  {
    id: "one",
    cardId: "card",
    authorName: "Анна",
    authorRole: "коллега",
    authorAvatarUrl: null,
    message: "Спасибо за твою поддержку и умение находить добрые слова в нужный момент.",
    sortOrder: 0,
    status: "visible",
    source: "participant",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "two",
    cardId: "card",
    authorName: "Игорь",
    authorRole: "друг",
    authorAvatarUrl: null,
    message: "Пусть впереди будет ещё больше радостных дней, путешествий и встреч с близкими.",
    sortOrder: 1,
    status: "visible",
    source: "participant",
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z"
  },
  {
    id: "three",
    cardId: "card",
    authorName: "Мария",
    authorRole: "сестра",
    authorAvatarUrl: null,
    message: "Твоё чувство юмора делает любой обычный день намного светлее и теплее.",
    sortOrder: 2,
    status: "visible",
    source: "participant",
    createdAt: "2026-06-03T00:00:00.000Z",
    updatedAt: "2026-06-03T00:00:00.000Z"
  }
];

describe("AI card insights", () => {
  it("accepts three quotes tied to their sources", () => {
    const result = validateBestQuoteCandidates(
      contributions.map((item) => ({ text: item.message, sourceContributionId: item.id })),
      contributions
    );

    expect(result).toHaveLength(3);
  });

  it("rejects a quote attributed to an unknown source", () => {
    const result = validateBestQuoteCandidates(
      contributions.map((item, index) => ({
        text: item.message,
        sourceContributionId: index === 0 ? "missing" : item.id
      })),
      contributions
    );

    expect(result).toBeNull();
  });

  it("rejects generic greetings and quotes that do not fit the card", () => {
    expect(validateBestQuoteCandidates([
      { text: "Ирина Олеговна, поздравляем с днём рождения!", sourceContributionId: "one" },
      { text: contributions[1].message, sourceContributionId: "two" },
      { text: contributions[2].message, sourceContributionId: "three" }
    ], contributions)).toBeNull();

    expect(validateBestQuoteCandidates([
      { text: "Очень ".repeat(30), sourceContributionId: "one" },
      { text: contributions[1].message, sourceContributionId: "two" },
      { text: contributions[2].message, sourceContributionId: "three" }
    ], contributions)).toBeNull();
  });

  it("fallback selects meaningful parts instead of greeting formulas", () => {
    const source = [
      { ...contributions[0], message: "Ирина Олеговна, поздравляем с днём рождения! Ваше мастерство вызывает уважение, а дети тянутся к вам." },
      { ...contributions[1], message: "Ирина Олеговна, с днём рождения! Благодаря утренникам и песням дети уходят с восторгом — это лучшая награда." },
      { ...contributions[2], message: "Ирина Олеговна, поздравляем! Часто дома слышим, как ребёнок рассказывает о похвале — это очень приятно." }
    ];
    const quotes = buildMockBestQuotes(source);

    expect(quotes).toHaveLength(3);
    expect(quotes.every((quote) => !/поздравл|с\s+дн[её]м\s+рожд/iu.test(quote.text))).toBe(true);
    expect(quotes.every((quote) => quote.text.length <= 120)).toBe(true);
    expect(quotes.map((quote) => quote.text).join(" ")).toContain("дети тянутся");
  });

  it("changes the fingerprint when a greeting changes", () => {
    const original = buildContributionFingerprint(contributions);
    const changed = buildContributionFingerprint([
      { ...contributions[0], message: `${contributions[0].message} Спасибо!` },
      ...contributions.slice(1)
    ]);

    expect(changed).not.toBe(original);
  });

  it("accepts five short qualities tied to known greetings", () => {
    const result = validateQualityCandidates(
      [
        { text: "поддержка", sourceContributionId: "one" },
        { text: "доброта", sourceContributionId: "one" },
        { text: "радость", sourceContributionId: "two" },
        { text: "чувство юмора", sourceContributionId: "three" },
        { text: "тепло", sourceContributionId: "three" }
      ],
      contributions
    );

    expect(result).toHaveLength(5);
  });

  it("extracts grounded qualities for the local fallback", () => {
    const result = buildMockQualities(contributions);

    expect(result.map((item) => item.text)).toEqual(expect.arrayContaining(["доброта", "поддержка", "тепло"]));
    expect(result.every((item) => contributions.some((source) => source.id === item.sourceContributionId))).toBe(true);
  });
});
