import { describe, expect, it } from "vitest";
import {
  getUniversalTemplateFixture,
  universalMessageScenarios,
  universalTemplateFixtures,
  validateUniversalTemplateFixture,
  type UniversalTemplateFixture
} from "@/lib/templates/fixtures";

describe("universal-v1 fixtures", () => {
  it("содержит общие состояния и тематические fixtures педагога и воспитателя", () => {
    expect(Object.keys(universalTemplateFixtures)).toEqual([
      "full-card-default",
      "teacher-classic",
      "kindergarten-demo",
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

  it("фиксирует демонстрацию воспитателю с двумя фото и отдельными тремя моментами", () => {
    const fixture = getUniversalTemplateFixture("kindergarten-demo");

    expect(fixture.recipientName).toBe("Елизавета Степановна");
    expect(fixture.contributions).toHaveLength(15);
    expect(fixture.photos.slice(0, 2).every((photo) => photo.width > photo.height)).toBe(true);
    expect(fixture.memoryPhotoIds).toEqual([
      "kindergarten-photo-create-together",
      "kindergarten-photo-small-discoveries",
      "kindergarten-photo-friendly-group"
    ]);
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
