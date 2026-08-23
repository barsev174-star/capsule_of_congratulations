import { describe, expect, it } from "vitest";
import { universalMessageScenarios } from "@/lib/templates/fixtures";
import {
  buildUniversalFixtureViewModel,
  formatUniversalEventDate,
  getUniversalRenderedBlocks,
  universalScenarioCardCount,
  universalScenarioPhotoCount
} from "@/lib/templates/view-model";

describe("UniversalTemplateViewModel", () => {
  it("фиксирует параметры всех шести схем поздравлений", () => {
    expect(universalMessageScenarios.map((scenario) => ({
      scenario,
      cards: universalScenarioCardCount[scenario],
      photos: universalScenarioPhotoCount[scenario]
    }))).toEqual([
      { scenario: "grid-2", cards: 4, photos: 0 },
      { scenario: "carousel-1", cards: 3, photos: 0 },
      { scenario: "carousel-2", cards: 6, photos: 0 },
      { scenario: "portrait", cards: 3, photos: 1 },
      { scenario: "landscape-pair", cards: 4, photos: 2 },
      { scenario: "landscape-trio", cards: 4, photos: 3 }
    ]);
  });

  it("синхронизирует сценарий с фактическим количеством фотографий", () => {
    expect(buildUniversalFixtureViewModel("full-card-default", { scenario: "landscape-trio", photoCount: 1 }).messageScenario).toBe("portrait");
    expect(buildUniversalFixtureViewModel("full-card-default", { scenario: "portrait", photoCount: 2 }).messageScenario).toBe("landscape-pair");
    expect(buildUniversalFixtureViewModel("full-card-default", { scenario: "grid-2", photoCount: 3 }).messageScenario).toBe("landscape-trio");
  });

  it("переключает короткое и длинное имя независимо от предельных текстов", () => {
    const shortName = buildUniversalFixtureViewModel("text-stress", { longName: false });
    const longName = buildUniversalFixtureViewModel("text-stress", { longName: true });

    expect(shortName.recipientName).toBe("Кристина");
    expect(longName.recipientName).toHaveLength(44);
    expect(longName.recipientName.split(" ")).toHaveLength(2);
  });

  it("строит канонический private-порядок и скрывает пустые optional-блоки", () => {
    const full = buildUniversalFixtureViewModel("full-card-default");
    const minimal = buildUniversalFixtureViewModel("minimal", { optionalBlocks: false });

    expect(getUniversalRenderedBlocks(full, "private")).toEqual([
      "hero", "summary", "qualities", "messages", "memories", "quotes", "closing"
    ]);
    expect(getUniversalRenderedBlocks(minimal, "private")).toEqual([
      "hero", "summary", "messages", "closing"
    ]);
    expect(full.summaryTitle).toBe("Главное о тебе");
    expect(full.mainGreetingAuthorName).toBe(full.contributions[0]?.authorName);
    expect(full.heroDescription).toBe("Тёплые слова, яркие моменты и пожелания специально для тебя.");
  });

  it.each([0, 1, 2, 3] as const)("не связывает три фото «Моментов» со схемой поздравлений (%s фото)", (photoCount) => {
    const model = buildUniversalFixtureViewModel("full-card-default", { photoCount });

    expect(model.messagePhotos).toHaveLength(photoCount);
    expect(model.memoryPhotos).toHaveLength(3);
  });

  it("считает уникальные исходные фотографии, а не повторные размещения", () => {
    const model = buildUniversalFixtureViewModel("teacher-classic", { photoCount: 3 });

    expect(model.privatePhotoCount).toBe(4);
    expect(new Set([...model.messagePhotos, ...model.memoryPhotos].map((photo) => photo.id)).size).toBe(4);
  });

  it("форматирует дату события единым русским formatter", () => {
    expect(formatUniversalEventDate("2026-01-01")).toBe("01 января 2026");
    expect(formatUniversalEventDate(null)).toBeNull();
  });
});
