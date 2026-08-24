import { describe, expect, it } from "vitest";
import { exampleCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel } from "./example-card";

describe("example card", () => {
  it("uses the agreed photo groups", () => {
    expect(exampleCardModel.messageMediaAssets.map((asset) => asset.fileName)).toEqual(["1.jpg", "3.jpg", "5.jpg"]);
    expect(exampleCardModel.memoryMediaAssets.map((asset) => asset.fileName)).toEqual(["2.jpg", "4.jpg", "6.jpg"]);
  });

  it("contains the complete demonstration content", () => {
    expect(exampleCardModel.contributions).toHaveLength(6);
    expect(exampleCardModel.quotes).toHaveLength(3);
    expect(exampleCardModel.qualities).toHaveLength(6);
  });
});

describe("school scrapbook demo card", () => {
  it("targets the school-scrapbook template for Алиса on 2026-09-01", () => {
    expect(schoolScrapbookDemoCardModel.templateId).toBe("school-scrapbook");
    expect(schoolScrapbookDemoCardModel.recipientName).toBe("Алиса");
    expect(schoolScrapbookDemoCardModel.eventDate).toBe("2026-09-01");
    expect(schoolScrapbookDemoCardModel.participantCount).toBe(9);
  });

  it("contains nine contributions with the main greeting first", () => {
    const { contributions, mainGreeting } = schoolScrapbookDemoCardModel;
    expect(contributions).toHaveLength(9);
    expect(contributions[0].authorName).toBe("Мама и папа");
    expect(contributions[0].authorRole).toBe("родители");
    expect(contributions[0].message).toBe(mainGreeting);
    expect(new Set(contributions.map((item) => item.id)).size).toBe(9);
    expect(contributions.every((item) => item.id.startsWith("example-alisa-"))).toBe(true);
  });

  it("lists exactly five qualities in the agreed order", () => {
    expect(schoolScrapbookDemoCardModel.qualities).toEqual([
      "доброта",
      "любознательность",
      "старание",
      "дружелюбие",
      "смелость"
    ]);
  });

  it("keeps exactly three private quotes and no public quotes", () => {
    expect(schoolScrapbookDemoCardModel.privateQuotes).toEqual([
      "Пусть каждый школьный день приносит тебе новое маленькое открытие.",
      "Не бойся ошибаться — самые интересные победы начинаются с попытки.",
      "Пусть рядом будут люди, с которыми интересно учиться, дружить и мечтать."
    ]);
    expect(schoolScrapbookDemoCardModel.publicQuotes).toEqual([]);
  });

  it("uses the portrait message scenario with a single captioned photo", () => {
    const { messageScenario, messagePhotos } = schoolScrapbookDemoCardModel;
    expect(messageScenario).toBe("portrait");
    expect(messagePhotos).toHaveLength(1);
    expect(messagePhotos[0].src).toBe("/examples/alisa-school/alice-portrait.webp");
    expect(messagePhotos[0].caption).toBe("Первое сентября — начало новых открытий");
    expect(messagePhotos[0].width).toBe(1086);
    expect(messagePhotos[0].height).toBe(1448);
    expect(messagePhotos[0].crop).toEqual({ x: 0.5, y: 0.5, zoom: 1 });
  });

  it("maps three landscape memory photos to their files and captions", () => {
    expect(
      schoolScrapbookDemoCardModel.memoryPhotos.map((photo) => [photo.src, photo.caption, photo.width, photo.height])
    ).toEqual([
      ["/examples/alisa-school/alice-friends.webp", "Друзья рядом — и всё становится веселее", 1489, 1056],
      ["/examples/alisa-school/alice-parents-school.webp", "Первый школьный день, который хочется запомнить", 1448, 1086],
      ["/examples/alisa-school/alice-family-home.webp", "Утро, полное волнения и улыбок", 1448, 1086]
    ]);
  });

  it("uses the agreed private signature", () => {
    expect(schoolScrapbookDemoCardModel.privateSignature).toBe("С любовью и верой в тебя — твоя семья.");
  });
});

describe("school classic demo card", () => {
  it("uses the accepted teacher fixture in the school-classic template", () => {
    expect(schoolClassicDemoCardModel.templateId).toBe("school-classic");
    expect(schoolClassicDemoCardModel.recipientName).toBe("Анна Сергеевна");
    expect(schoolClassicDemoCardModel.contributions).toHaveLength(20);
    expect(schoolClassicDemoCardModel.qualities).toHaveLength(5);
    expect(schoolClassicDemoCardModel.messageScenario).toBe("portrait");
    expect(schoolClassicDemoCardModel.messagePhotos).toHaveLength(1);
    expect(schoolClassicDemoCardModel.messagePhotos[0].caption).toBe("С Вами хочется узнавать больше");
    expect(schoolClassicDemoCardModel.memoryPhotos).toHaveLength(3);
    expect(schoolClassicDemoCardModel.memoryPhotos.map((photo) => photo.caption)).toEqual([
      "Когда сложное становится понятным",
      "Начало ещё одной общей истории",
      "Те, ради кого всё это"
    ]);
    expect(schoolClassicDemoCardModel.privateQuotes).toHaveLength(3);
  });
});
