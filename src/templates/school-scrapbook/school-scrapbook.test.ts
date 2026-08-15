import { describe, expect, it } from "vitest";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";
import { school_scrapbookProfile } from "./profile";

describe("school-scrapbook studio template", () => {
  it("keeps the studio profile valid and registered", () => {
    const dispatch = dispatchTemplateRenderer("school-scrapbook");
    const draft = createTemplateStudioDraft(school_scrapbookProfile);

    expect(validateTemplateProfile(school_scrapbookProfile)).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatch?.kind).toBe("universal-v1");
    expect(dispatch?.registration.id).toBe("school-scrapbook");
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
    expect(school_scrapbookProfile.assets.sections.memories?.preset).toBe("adaptive-frame");
  });
});
