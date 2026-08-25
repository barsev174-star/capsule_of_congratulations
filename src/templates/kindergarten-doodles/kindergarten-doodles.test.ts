import { describe, expect, it } from "vitest";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { getUniversalTemplateFixture } from "@/lib/templates/fixtures";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { kindergarten_doodlesProfile } from "./profile";
import { kindergarten_doodlesRegistration } from "./registration";

describe("kindergarten-doodles product template", () => {
  it("uses the universal atelier contract and is available in the product", () => {
    const dispatch = dispatchTemplateRenderer("kindergarten-doodles");
    const draft = createTemplateStudioDraft(kindergarten_doodlesProfile);

    expect(validateTemplateProfile(kindergarten_doodlesProfile)).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatch?.kind).toBe("universal-v1");
    expect(dispatch?.registration.id).toBe("kindergarten-doodles");
    expect(kindergarten_doodlesRegistration.catalog.availability).toBe("product");
    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
    expect(Object.keys(kindergarten_doodlesProfile.assets.sections)).toEqual(["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"]);
  });

  it("locks the approved two-landscape-photo demonstration scheme", () => {
    const fixture = getUniversalTemplateFixture("kindergarten-demo");
    const model = buildUniversalFixtureViewModel(kindergarten_doodlesProfile.demo.fixture, {
      templateId: kindergarten_doodlesProfile.id,
      scenario: kindergarten_doodlesProfile.demo.scenario,
      photoCount: kindergarten_doodlesProfile.demo.photoCount
    });

    expect(fixture.contributions).toHaveLength(15);
    expect(kindergarten_doodlesProfile.demo).toEqual({ fixture: "kindergarten-demo", scenario: "landscape-pair", photoCount: 2 });
    expect(model.messageScenario).toBe("landscape-pair");
    expect(model.messagePhotos).toHaveLength(2);
    expect(model.messagePhotos.every((photo) => photo.width > photo.height)).toBe(true);
    expect(model.memoryPhotos).toHaveLength(3);
  });

  it("uses distinct paper cards, export plaques and drawing-led hero decor", () => {
    expect(kindergarten_doodlesProfile.assets.greetingCards).toHaveLength(4);
    expect(kindergarten_doodlesProfile.assets.qualityCards).toHaveLength(5);
    expect(kindergarten_doodlesProfile.assets.exportQualityCards).toHaveLength(5);
    expect(kindergarten_doodlesProfile.assets.quoteCards).toHaveLength(3);
    expect(kindergarten_doodlesProfile.assets.qualityCards.every(({ preset }) => preset === "quality-doodle-poster")).toBe(true);
    expect(kindergarten_doodlesProfile.assets.exportQualityCards?.every(({ preset }) => preset === "quality-doodle-export")).toBe(true);
    expect(kindergarten_doodlesProfile.assets.qualityCards[4]?.asset.src).toBe("/templates/kindergarten-doodles/quality-card-5-v4.webp");
    expect(kindergarten_doodlesProfile.assets.exportQualityCards?.map(({ asset }) => asset.src)).toEqual([
      "/templates/kindergarten-doodles/quality-card-1-export-v3.webp",
      "/templates/kindergarten-doodles/quality-card-2-export-v3.webp",
      "/templates/kindergarten-doodles/quality-card-3-export-v3.webp",
      "/templates/kindergarten-doodles/quality-card-4-export-v3.webp",
      "/templates/kindergarten-doodles/quality-card-5-export-v5.webp"
    ]);
    expect(kindergarten_doodlesProfile.assets.photoFrames.messagePortrait).toMatchObject({
      preset: "portrait-caption-paper",
      caption: { layout: "standard" }
    });
    expect(kindergarten_doodlesProfile.assets.photoFrames.messagePortrait.base).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.photoFrames.messagePortrait.overlay).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.photoFrames.messageLandscape).toMatchObject({
      preset: "landscape-caption-paper",
      caption: { layout: "standard" }
    });
    expect(kindergarten_doodlesProfile.assets.photoFrames.messageLandscape.base).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.photoFrames.messageLandscape.overlay).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.photoFrames.memory).toMatchObject({
      preset: "landscape-caption-paper",
      caption: { layout: "standard", paper: "mint-coral" }
    });
    expect(kindergarten_doodlesProfile.assets.photoFrames.memory.base).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.photoFrames.memory.overlay).toBeUndefined();
    expect(kindergarten_doodlesProfile.assets.decor.map(({ visibleOn }) => visibleOn)).toEqual([
      ["desktop"], ["desktop"], ["export"], ["export"], ["mobile"], ["mobile"]
    ]);
    expect(kindergarten_doodlesProfile.assets.decor.filter(({ visibleOn }) => visibleOn.includes("export")).every(({ exportVariants }) => Boolean(exportVariants?.story && exportVariants.post && exportVariants.a4))).toBe(true);
    expect(kindergarten_doodlesProfile.assets.decor.find(({ id }) => id === "hero-drawing-export")?.exportVariants?.post?.rect)
      .toEqual({ x: 0, y: 0.105, width: 0.22, height: 1.38 });
  });

  it("uses one purpose-built mobile underlay for every tall paper surface", () => {
    expect(kindergarten_doodlesProfile.assets.sections.summary.mobileAsset?.src).toBe("/templates/kindergarten-doodles/section-summary-mobile-v2.webp");
    expect(kindergarten_doodlesProfile.assets.sections.messages.mobileAsset?.src).toBe("/templates/kindergarten-doodles/section-messages-mobile-v2.webp");
    expect(kindergarten_doodlesProfile.assets.sections.memories.mobileAsset?.src).toBe("/templates/kindergarten-doodles/section-memories-mobile-v1.webp");
    expect(kindergarten_doodlesProfile.assets.sections.closing.mobileAsset?.src).toBe("/templates/kindergarten-doodles/section-closing-mobile-v7.webp");
    expect(kindergarten_doodlesProfile.assets.greetingCards.map(({ mobileAsset }) => mobileAsset?.src)).toEqual([
      "/templates/kindergarten-doodles/greeting-card-mobile-1-v2.webp",
      "/templates/kindergarten-doodles/greeting-card-mobile-2-v2.webp",
      "/templates/kindergarten-doodles/greeting-card-mobile-3-v2.webp",
      "/templates/kindergarten-doodles/greeting-card-mobile-4-v2.webp"
    ]);
  });

  it("keeps the artistic palette inside the card and uses readable navy typography", () => {
    expect(kindergarten_doodlesProfile.colors.text).toBe("#18324c");
    expect(kindergarten_doodlesProfile.colors.accent).toBe("#ef7665");
    expect(kindergarten_doodlesProfile.metadata.accent).toBe("#ef7665");
    expect(kindergarten_doodlesProfile.intro.kicker).toBe("Открытка воспитателю");
    expect(kindergarten_doodlesProfile.copy).toEqual({ qualitiesTitle: "За что Вас ценят", quotesTitle: "Лучшие фразы" });
  });
});
