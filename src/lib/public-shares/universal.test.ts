import { describe, expect, it } from "vitest";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { getUniversalRenderedBlocks } from "@/lib/templates/view-model";
import {
  buildUniversalPublicSharePayload,
  buildUniversalPublicViewModel,
  toUniversalPhotoCrop
} from "./universal";

const profile = createTemplateStudioProfile("universal-public-test");
const photo = (index: number) => ({
  id: `photo-${index}`,
  url: `/share/token/photo/${index}`,
  width: 1600,
  height: 1200,
  caption: `Публичная подпись ${index}`,
  crop: { x: 0.2 * index, y: 0.1 * index, zoom: 1 + index * 0.2 }
});

const payload = (photoCount = 3) => buildUniversalPublicSharePayload({
  templateId: profile.id,
  displayName: "Александра",
  headlinePreset: "GIFTED_CARD",
  showOccasion: true,
  showEventDate: true,
  showGreetingCount: true,
  showPhotoCount: true,
  occasionText: "С днём рождения!",
  eventDate: "2026-08-11",
  fromLabel: "От команды",
  greetingCount: 12,
  photoCount: 6,
  qualities: ["доброта", "юмор", "надёжность", "внимание", "вдохновение"],
  phrases: ["Первая фраза", "Вторая фраза", "Третья фраза"],
  photos: Array.from({ length: photoCount }, (_, index) => photo(index + 1))
});

describe("universal public share", () => {
  it("normalizes legacy percent crop exactly once", () => {
    expect(toUniversalPhotoCrop({ cropX: 82, cropY: 34, cropZoom: 1.4 })).toEqual({
      x: 0.82,
      y: 0.34,
      zoom: 1.4
    });
    expect(toUniversalPhotoCrop({ cropX: -5, cropY: 140, cropZoom: 9 })).toEqual({
      x: 0,
      y: 1,
      zoom: 3
    });
  });

  it("creates a versioned payload without private card content", () => {
    const result = payload();
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({ version: 2, family: "universal-v1" });
    expect(result.photos).toHaveLength(3);
    expect(result.photos[0].crop).toEqual({ x: 0.2, y: 0.1, zoom: 1.2 });
    expect(serialized).not.toMatch(/contributions|mainGreeting|summary|privateSignature|finalSlug/);
  });

  it("applies independent public visibility flags before rendering", () => {
    const result = buildUniversalPublicSharePayload({
      ...payload(),
      templateId: profile.id,
      displayName: "Александра",
      headlinePreset: "GIFTED_CARD",
      showOccasion: false,
      showEventDate: false,
      showGreetingCount: false,
      showPhotoCount: false,
      occasionText: "Скрытый повод",
      eventDate: "2026-08-11",
      fromLabel: "От команды",
      greetingCount: 12,
      photoCount: 6,
      qualities: payload().qualities,
      phrases: payload().phrases,
      photos: payload().photos
    });

    expect(result.card).toMatchObject({ occasionText: null, eventDate: null, greetingCount: 0, photoCount: 0 });
  });

  it("builds only the approved public blocks and requires exactly three memory photos", () => {
    const fullModel = buildUniversalPublicViewModel(payload(3), profile);
    const partialModel = buildUniversalPublicViewModel(payload(2), profile);

    expect(getUniversalRenderedBlocks(fullModel, "public")).toEqual(["hero", "qualities", "memories", "quotes", "public-note"]);
    expect(fullModel.contributions).toEqual([]);
    expect(fullModel.mainGreeting).toBe("");
    expect(partialModel.memoryPhotos).toEqual([]);
    expect(getUniversalRenderedBlocks(partialModel, "public")).not.toContain("memories");
  });

  it("uses the two-line public header rule from the template profile", () => {
    const configuredProfile = {
      ...profile,
      public: {
        ...profile.public,
        heroDescription: "Первая строка\nВторая строка"
      }
    };

    expect(buildUniversalPublicViewModel(payload(), configuredProfile).heroDescription)
      .toBe("Первая строка\nВторая строка");
  });
});
