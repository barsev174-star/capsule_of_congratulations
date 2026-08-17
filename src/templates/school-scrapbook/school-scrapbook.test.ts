import { describe, expect, it } from "vitest";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";
import { school_scrapbookProfile } from "./profile";
import { school_scrapbookRegistration } from "./registration";

describe("school-scrapbook studio template", () => {
  it("keeps the studio profile valid and registered", () => {
    const dispatch = dispatchTemplateRenderer("school-scrapbook");
    const draft = createTemplateStudioDraft(school_scrapbookProfile);

    expect(validateTemplateProfile(school_scrapbookProfile)).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatch?.kind).toBe("universal-v1");
    expect(dispatch?.registration.id).toBe("school-scrapbook");
    expect(school_scrapbookRegistration.catalog.availability).toBe("product");
    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
  });

  it("assigns a distinct paper asset to each of the five qualities", () => {
    expect(school_scrapbookProfile.assets.qualityCards.map(({ asset }) => asset.src)).toEqual([
      "/templates/school-scrapbook/quality-card-1-v2.webp",
      "/templates/school-scrapbook/quality-card-2-v2.webp",
      "/templates/school-scrapbook/quality-card-3-v2.webp",
      "/templates/school-scrapbook/quality-card-4-v2.webp",
      "/templates/school-scrapbook/quality-card-5-v2.webp"
    ]);
    expect(school_scrapbookProfile.assets.exportQualityCards?.map(({ asset, preset }) => ({ src: asset.src, size: `${asset.width}x${asset.height}`, preset }))).toEqual([
      { src: "/templates/school-scrapbook/quality-card-1-export-v1.webp", size: "720x180", preset: "quality-pill-export" },
      { src: "/templates/school-scrapbook/quality-card-2-export-v1.webp", size: "720x180", preset: "quality-pill-export" },
      { src: "/templates/school-scrapbook/quality-card-3-export-v1.webp", size: "720x180", preset: "quality-pill-export" },
      { src: "/templates/school-scrapbook/quality-card-4-export-v1.webp", size: "720x180", preset: "quality-pill-export" },
      { src: "/templates/school-scrapbook/quality-card-5-export-v1.webp", size: "720x180", preset: "quality-pill-export" }
    ]);
  });

  it("uses cache-busted notebook surfaces for messages, captions, and quotes", () => {
    expect(school_scrapbookProfile.assets.greetingCards.map(({ asset }) => asset.src)).toEqual([
      "/templates/school-scrapbook/greeting-card-1-v3.webp",
      "/templates/school-scrapbook/greeting-card-2-v3.webp",
      "/templates/school-scrapbook/greeting-card-3-v3.webp",
      "/templates/school-scrapbook/greeting-card-4-v3.webp"
    ]);
    expect(school_scrapbookProfile.assets.quoteCards.map(({ asset }) => asset.src)).toEqual([
      "/templates/school-scrapbook/quote-card-v3.webp"
    ]);
    expect(school_scrapbookProfile.assets.photoFrames.messagePortrait.base?.src).toContain("photo-frame-portrait-v3-base.webp");
    expect(school_scrapbookProfile.assets.photoFrames.memory.base?.src).toContain("photo-frame-landscape-v3-base.webp");
    expect(school_scrapbookProfile.assets.photoFrames.messagePortrait.caption.minScale).toBe(0.7);
    expect(school_scrapbookProfile.assets.photoFrames.messageLandscape.caption.minScale).toBe(0.7);
    expect(school_scrapbookProfile.assets.photoFrames.memory.caption.minScale).toBe(0.7);
  });

  it("uses distinct proportional surfaces for the featured greeting, messages, and closing", () => {
    expect(school_scrapbookProfile.assets.sections.summary).toEqual(expect.objectContaining({
      preset: "cover",
      asset: expect.objectContaining({ src: "/templates/school-scrapbook/section-summary-featured-desktop-v3.webp" }),
      mobileAsset: expect.objectContaining({ src: "/templates/school-scrapbook/section-summary-featured-mobile-v3.webp" }),
      safeArea: { x: 0.18, y: 0.1, width: 0.64, height: 0.8 }
    }));
    expect(school_scrapbookProfile.assets.sections.messages).toEqual(expect.objectContaining({
      preset: "cover",
      asset: expect.objectContaining({ src: "/templates/school-scrapbook/section-messages-doodles-desktop-v3.webp" }),
      mobileAsset: expect.objectContaining({ src: "/templates/school-scrapbook/section-messages-doodles-mobile-v3.webp" })
    }));
    expect(school_scrapbookProfile.assets.sections.closing).toEqual(expect.objectContaining({
      preset: "cover",
      asset: expect.objectContaining({ src: "/templates/school-scrapbook/section-closing-finale-desktop-v3.webp" }),
      mobileAsset: expect.objectContaining({ src: "/templates/school-scrapbook/section-closing-finale-mobile-v3.webp" })
    }));
    expect(school_scrapbookProfile.assets.sections.memories).toEqual(expect.objectContaining({
      preset: "adaptive-frame",
      safeArea: { x: 0.04, y: 0.075, width: 0.92, height: 0.85 }
    }));
  });

  it("anchors colorful decor to the blocks it must follow", () => {
    expect(school_scrapbookProfile.assets.decor.map(({ id, anchor, visibleOn }) => ({ id, anchor, visibleOn }))).toEqual([
      { id: "hero-globe-cluster", anchor: "hero", visibleOn: ["desktop"] },
      { id: "hero-globe-cluster-export", anchor: "hero", visibleOn: ["export"] },
      { id: "hero-backpack-cluster", anchor: "hero", visibleOn: ["desktop"] },
      { id: "hero-backpack-cluster-export", anchor: "hero", visibleOn: ["export"] },
      { id: "summary-blue-rays-left", anchor: "summary", visibleOn: ["desktop", "export"] },
      { id: "summary-blue-rays-right", anchor: "summary", visibleOn: ["desktop", "export"] },
      { id: "closing-grade-5plus", anchor: "closing", visibleOn: ["desktop", "export"] },
      { id: "closing-student-doodle", anchor: "closing", visibleOn: ["desktop"] },
      { id: "closing-student-doodle-export", anchor: "closing", visibleOn: ["export"] },
      { id: "closing-student-girl-doodle", anchor: "closing", visibleOn: ["desktop"] },
      { id: "closing-student-girl-doodle-export", anchor: "closing", visibleOn: ["export"] },
      { id: "hero-student-doodle-mobile", anchor: "hero", visibleOn: ["mobile"] },
      { id: "hero-student-girl-doodle-mobile", anchor: "hero", visibleOn: ["mobile"] }
    ]);
  });

  it("keeps the positions exported from the template studio", () => {
    expect(Object.fromEntries(school_scrapbookProfile.assets.decor.map(({ id, rect }) => [id, rect]))).toEqual({
      "hero-globe-cluster": { x: -0.025, y: 0.125, width: 0.32, height: 0.95 },
      "hero-globe-cluster-export": { x: -0.13, y: 0.18, width: 0.45, height: 1 },
      "hero-backpack-cluster": { x: 0.595, y: 0.27, width: 0.47, height: 0.785 },
      "hero-backpack-cluster-export": { x: 0.66, y: 0.17, width: 0.52, height: 1 },
      "summary-blue-rays-left": { x: -0.14, y: 0.245, width: 0.2, height: 0.585 },
      "summary-blue-rays-right": { x: 0.93, y: 0.27, width: 0.24, height: 0.585 },
      "closing-grade-5plus": { x: 0.74, y: 0.075, width: 0.275, height: 0.545 },
      "closing-student-doodle": { x: 0.19, y: 0.295, width: 0.09, height: 0.54 },
      "closing-student-doodle-export": { x: 0.165, y: 0.445, width: 0.09, height: 0.54 },
      "closing-student-girl-doodle": { x: 0.7, y: 0.295, width: 0.084, height: 0.54 },
      "closing-student-girl-doodle-export": { x: 0.7, y: 0.42, width: 0.084, height: 0.54 },
      "hero-student-doodle-mobile": { x: 0.035, y: 0.69, width: 0.18, height: 0.26 },
      "hero-student-girl-doodle-mobile": { x: 0.785, y: 0.69, width: 0.17, height: 0.26 }
    });
  });

  it("keeps the downloadable hero decor intersecting the header canvas", () => {
    const exportHeroDecor = school_scrapbookProfile.assets.decor.filter(
      ({ anchor, visibleOn }) => anchor === "hero" && visibleOn?.includes("export")
    );

    for (const { rect } of exportHeroDecor) {
      const visibleWidth = Math.min(1, rect.x + rect.width) - Math.max(0, rect.x);
      const visibleHeight = Math.min(1, rect.y + rect.height) - Math.max(0, rect.y);
      expect(visibleWidth).toBeGreaterThan(0);
      expect(visibleHeight).toBeGreaterThan(0);
    }
  });

  it("uses the school-blue accent for template actions", () => {
    expect(school_scrapbookProfile.colors.accent).toBe("#1859bd");
  });

  it("uses playful motion with section reveals and photo viewing", () => {
    expect(school_scrapbookProfile.motion).toEqual({
      preset: "playful",
      revealSections: true,
      photoViewer: true
    });
  });
});
