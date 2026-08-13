import { describe, expect, it } from "vitest";
import {
  getUniversalTemplateFixture,
  universalMessageScenarios,
  universalTemplateFixtures,
  validateUniversalTemplateFixture,
  type UniversalTemplateFixture
} from "@/lib/templates/fixtures";

describe("universal-v1 fixtures", () => {
  it("содержит все шесть независимых от оформления состояний", () => {
    expect(Object.keys(universalTemplateFixtures)).toEqual([
      "full-card-default",
      "text-stress",
      "minimal",
      "public-full",
      "public-no-photos",
      "photo-crop-stress"
    ]);
    expect(universalMessageScenarios).toHaveLength(6);
    Object.values(universalTemplateFixtures).forEach((fixture) => {
      expect(validateUniversalTemplateFixture(fixture)).toEqual([]);
    });
  });

  it("фиксирует утверждённые граничные значения 45/100/500", () => {
    const fixture = getUniversalTemplateFixture("text-stress");

    expect(fixture.recipientName).toHaveLength(44);
    expect(fixture.mainGreeting).toHaveLength(500);
    expect(fixture.quoteCandidates[0].text).toHaveLength(100);
    expect(fixture.photos[0].caption).toHaveLength(45);
    expect(fixture.photos[0].caption).not.toContain("…");
  });

  it("фиксирует поток лучших фраз и ровно три фото «Моментов»", () => {
    const fixture = getUniversalTemplateFixture("full-card-default");

    expect(fixture.quoteCandidates.length).toBeGreaterThanOrEqual(3);
    expect(fixture.quoteCandidates.length).toBeLessThanOrEqual(6);
    expect(fixture.organizerQuoteIds).toHaveLength(3);
    expect(fixture.recipientQuoteIds).toHaveLength(3);
    expect(fixture.memoryPhotoIds).toHaveLength(3);
  });

  it("отклоняет промежуточное количество фотографий «Моментов»", () => {
    const fixture = {
      ...getUniversalTemplateFixture("full-card-default"),
      memoryPhotoIds: ["photo-1", "photo-2"]
    };

    expect(validateUniversalTemplateFixture(fixture as unknown as UniversalTemplateFixture)).toContainEqual(expect.objectContaining({
      path: "memoryPhotoIds"
    }));
  });
});
