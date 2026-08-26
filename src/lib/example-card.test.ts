import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { exampleCardModel, kindergartenDoodlesDemoCardModel, schoolClassicDemoCardModel, schoolScrapbookDemoCardModel, teamEditorialDemoCardModel } from "./example-card";
import { birthdayExampleCardModel } from "./birthday-example";
import { isBirthdayExample } from "./birthday-scenario";
import { kristinaExamplePhotos } from "./kristina-example-photos";

describe("example card", () => {
  it("keeps family birthday content separate from the original paper example", () => {
    expect(exampleCardModel.fromLabel).toBe("от друзей и коллег");
    expect(birthdayExampleCardModel.style).toBe(exampleCardModel.style);
    expect(birthdayExampleCardModel.fromLabel).toBe("от друзей и семьи");
    expect(birthdayExampleCardModel.participantCount).toBe(birthdayExampleCardModel.contributions.length);
    expect(birthdayExampleCardModel.contributions.some((item) => item.authorRole === "коллега")).toBe(false);
    expect(birthdayExampleCardModel.contributions.some((item) => item.authorRole === "мама")).toBe(true);
    for (const quote of birthdayExampleCardModel.quotes) {
      const [text, author] = quote.split("\n— ");
      expect(birthdayExampleCardModel.contributions.find((item) => item.authorName === author)?.message).toContain(text);
    }
    expect(birthdayExampleCardModel.mediaAssets).toHaveLength(6);
  });

  it("selects the birthday scenario only for the existing paper template", () => {
    expect(isBirthdayExample("paper-birthday", "birthday")).toBe(true);
    expect(isBirthdayExample(undefined, "birthday")).toBe(true);
    expect(isBirthdayExample("paper", "birthday")).toBe(true);
    expect(isBirthdayExample("team-editorial", "birthday")).toBe(false);
    expect(isBirthdayExample("paper-birthday", "other")).toBe(false);
  });
  it("uses the agreed photo groups", () => {
    expect(exampleCardModel.messageMediaAssets.map((asset) => asset.fileName)).toEqual(["birthday-with-friends-v1.webp", "summer-walk-v1.webp", "breakfast-together-v1.webp"]);
    expect(exampleCardModel.memoryMediaAssets.map((asset) => asset.fileName)).toEqual(["tea-with-mum-v1.webp", "lake-with-brother-v1.webp", "celebration-with-grandma-v1.webp"]);
  });

  it("shares complete dedicated Kristina photos between the paper and birthday demos", async () => {
    for (const model of [exampleCardModel, birthdayExampleCardModel]) {
      expect(model.mediaAssets.map((asset) => asset.publicUrl)).toEqual(kristinaExamplePhotos.map((photo) => photo.src));
      expect(model.mediaAssets.every((asset) => asset.mimeType === "image/webp")).toBe(true);
    }
    for (const photo of kristinaExamplePhotos) {
      expect(photo.src).toMatch(/^\/examples\/kristina-birthday\//);
      const file = await readFile(path.join(process.cwd(), "public", photo.src));
      const metadata = await sharp(file).metadata();
      expect(metadata).toMatchObject({ format: "webp", width: photo.width, height: photo.height });
    }
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

describe("kindergarten doodles demo card", () => {
  it("uses the accepted caregiver fixture in the kindergarten-doodles template", () => {
    expect(kindergartenDoodlesDemoCardModel.templateId).toBe("kindergarten-doodles");
    expect(kindergartenDoodlesDemoCardModel.recipientName).toBe("Елизавета Степановна");
    expect(kindergartenDoodlesDemoCardModel.contributions).toHaveLength(15);
    expect(kindergartenDoodlesDemoCardModel.qualities).toHaveLength(5);
    expect(kindergartenDoodlesDemoCardModel.messageScenario).toBe("landscape-pair");
    expect(kindergartenDoodlesDemoCardModel.messagePhotos).toHaveLength(2);
    expect(kindergartenDoodlesDemoCardModel.memoryPhotos).toHaveLength(3);
    expect(kindergartenDoodlesDemoCardModel.privateQuotes).toHaveLength(3);
  });
});

describe("team editorial demo card", () => {
  it("uses the promotion fixture in the Together template", () => {
    expect(teamEditorialDemoCardModel.templateId).toBe("team-editorial");
    expect(teamEditorialDemoCardModel.recipientName).toBe("Егор Дмитриевич");
    expect(teamEditorialDemoCardModel.occasion).toBe("С повышением!");
    expect(teamEditorialDemoCardModel.contributions).toHaveLength(20);
    expect(teamEditorialDemoCardModel.qualities).toHaveLength(5);
    expect(teamEditorialDemoCardModel.messageScenario).toBe("landscape-trio");
    expect(teamEditorialDemoCardModel.messagePhotos).toHaveLength(3);
    expect(teamEditorialDemoCardModel.memoryPhotos).toHaveLength(3);
    expect(teamEditorialDemoCardModel.privateQuotes).toHaveLength(3);
  });
});
