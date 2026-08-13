import { describe, expect, it } from "vitest";
import {
  getUniversalMessageScenarioForPhotoCount,
  routeV1LayoutPreset
} from "@/lib/templates/layout-presets";

describe("route-v1 universal layout preset", () => {
  it("inherits the canonical greeting counts from the Route rules", () => {
    expect(Object.fromEntries(Object.entries(routeV1LayoutPreset.messages).map(([scenario, rule]) => [
      scenario,
      rule.cardsPerPage
    ]))).toEqual({
      "grid-2": 4,
      "carousel-1": 3,
      "carousel-2": 6,
      portrait: 3,
      "landscape-pair": 4,
      "landscape-trio": 4
    });
  });

  it("locks the Route media geometry for one, two and three photos", () => {
    expect(routeV1LayoutPreset.messages.portrait).toMatchObject({
      photoCount: 1,
      photoFrame: "portrait",
      mediaDistribution: "single-fill"
    });
    expect(routeV1LayoutPreset.messages["landscape-pair"]).toMatchObject({
      photoCount: 2,
      photoFrame: "landscape",
      mediaDistribution: "centered-pair"
    });
    expect(routeV1LayoutPreset.messages["landscape-trio"]).toMatchObject({
      photoCount: 3,
      photoFrame: "landscape",
      mediaDistribution: "distributed-trio"
    });
  });

  it("derives a media scenario from the actual number of selected photos", () => {
    expect(getUniversalMessageScenarioForPhotoCount("route-v1", 1, "landscape-trio")).toBe("portrait");
    expect(getUniversalMessageScenarioForPhotoCount("route-v1", 2, "portrait")).toBe("landscape-pair");
    expect(getUniversalMessageScenarioForPhotoCount("route-v1", 3, "grid-2")).toBe("landscape-trio");
    expect(getUniversalMessageScenarioForPhotoCount("route-v1", 0, "carousel-2")).toBe("carousel-2");
  });

  it("фиксирует компактную геометрию summary и карточек качеств", () => {
    expect(routeV1LayoutPreset.geometry).toMatchObject({
      summaryContentMaxWidth: 940,
      qualityCardHeight: 68,
      qualityFontMax: 16,
      messageTextFontMax: 17,
      messageTrioPhotoWidthPercent: 95,
      photoCaptionFontMax: 18,
      handwrittenPhotoCaptionFontMax: 24,
      memoryCaptionFontMax: 28,
      quoteTextFontMax: 17,
      photoCaptionInlinePaddingPercent: 8
    });
  });
});
