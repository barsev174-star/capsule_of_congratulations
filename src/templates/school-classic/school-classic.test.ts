import { describe, expect, it } from "vitest";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { getUniversalTemplateFixture } from "@/lib/templates/fixtures";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";
import { school_classicProfile } from "./profile";
import { school_classicRegistration } from "./registration";

describe("school-classic product template", () => {
  it("uses the accepted universal atelier contract and is product-ready", () => {
    const dispatch = dispatchTemplateRenderer("school-classic");
    const draft = createTemplateStudioDraft(school_classicProfile);

    expect(validateTemplateProfile(school_classicProfile)).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatch?.kind).toBe("universal-v1");
    expect(dispatch?.registration.id).toBe("school-classic");
    expect(school_classicRegistration.catalog.availability).toBe("product");
    expect(school_classicProfile.intro.preset).toBe("classic");
    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
    expect(Object.keys(school_classicProfile.assets.sections)).toEqual(["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"]);
  });

  it("uses teacher content, four greeting papers, and dedicated export quality plaques", () => {
    const fixture = getUniversalTemplateFixture("teacher-classic");

    expect(school_classicProfile.demo.fixture).toBe("teacher-classic");
    expect(fixture.recipientName).toBe("Анна Сергеевна");
    expect(fixture.contributions).toHaveLength(20);
    expect(fixture.memoryPhotoIds).toHaveLength(3);
    expect(school_classicProfile.assets.greetingCards).toHaveLength(4);
    expect(school_classicProfile.assets.qualityCards).toHaveLength(5);
    expect(school_classicProfile.assets.exportQualityCards).toHaveLength(5);
    expect(school_classicProfile.assets.quoteCards).toHaveLength(3);
    expect(school_classicProfile.assets.greetingCards.map(({ asset }) => asset.src)).toEqual([
      "/templates/school-classic/greeting-card-1-v4.webp",
      "/templates/school-classic/greeting-card-2-v4.webp",
      "/templates/school-classic/greeting-card-3-v4.webp",
      "/templates/school-classic/greeting-card-4-v4.webp"
    ]);
  });

  it("keeps summary copy on the sheet and gives messages a dedicated album surface", () => {
    expect(school_classicProfile.assets.page?.src).toBe("/templates/school-classic/page-v2.webp");
    expect(school_classicProfile.assets.sections.summary.asset.src).toContain("summary-desktop-v5");
    expect(school_classicProfile.assets.sections.summary.safeArea).toEqual({ x: 0.14, y: 0.07, width: 0.72, height: 0.84 });
    expect(school_classicProfile.assets.sections.messages.asset.src).toContain("section-messages-v2");
    expect(school_classicProfile.assets.sections.messages.asset.src).not.toBe(school_classicProfile.assets.sections.hero.asset.src);
    expect(school_classicProfile.assets.sections.messages.preset).toBe("adaptive-frame");
  });

  it("keeps gold photo corners in overlays and separates decor by surface", () => {
    expect(school_classicProfile.assets.photoFrames.messagePortrait.overlay?.src).toContain("portrait-v2-overlay");
    expect(school_classicProfile.assets.photoFrames.memory.overlay?.src).toContain("landscape-v2-overlay");
    expect(school_classicProfile.assets.decor.map(({ anchor, visibleOn }) => ({ anchor, visibleOn }))).toEqual([
      { anchor: "hero", visibleOn: ["desktop"] },
      { anchor: "hero", visibleOn: ["desktop"] },
      { anchor: "hero", visibleOn: ["export"] },
      { anchor: "hero", visibleOn: ["export"] },
      { anchor: "hero", visibleOn: ["mobile"] },
      { anchor: "hero", visibleOn: ["mobile"] }
    ]);
    expect(school_classicProfile.assets.decor.some(({ anchor }) => anchor === "qualities")).toBe(false);
  });

  it("locks the owner-adjusted hero composition", () => {
    const byId = new Map(school_classicProfile.assets.decor.map((layer) => [layer.id, layer]));

    expect(byId.get("hero-left-classic-desktop")).toEqual(expect.objectContaining({ rect: { x: -0.09, y: 0.09, width: 0.35, height: 0.9 }, rotation: -7 }));
    expect(byId.get("hero-right-classic-desktop")?.rect).toEqual({ x: 0.745, y: 0.04, width: 0.37, height: 1 });
    expect(byId.get("hero-left-classic-mobile")).toEqual(expect.objectContaining({ asset: expect.objectContaining({ src: "/templates/school-classic/decor-hero-left-mobile-v6.webp" }), rect: { x: -0.14, y: 0.165, width: 0.4, height: 0.44 }, rotation: -5 }));
    expect(byId.get("hero-right-classic-mobile")?.rect).toEqual({ x: 0.735, y: 0.14, width: 0.5, height: 0.515 });
    expect(byId.get("hero-left-classic-export")?.exportVariants).toEqual({
      story: { rect: { x: -0.09, y: 0.115, width: 0.425, height: 1 }, opacity: 0.99, rotation: -5 },
      post: { rect: { x: -0.09, y: 0.115, width: 0.425, height: 1.45 }, opacity: 0.99, rotation: -5 },
      a4: { rect: { x: -0.09, y: 0.1, width: 0.425, height: 1.45 }, opacity: 0.99, rotation: -5 }
    });
    expect(byId.get("hero-right-classic-export")?.exportVariants?.post.rect.height).toBe(1.45);
  });

  it("gives the memories album more usable room", () => {
    expect(school_classicProfile.assets.sections.memories.safeArea).toEqual({ x: 0.05, y: 0.08, width: 0.9, height: 0.84 });
  });

  it("preserves closing artwork proportions and uses classic labels", () => {
    expect(school_classicProfile.assets.sections.closing).toEqual(expect.objectContaining({
      preset: "cover",
      focalPoint: { x: 0.5, y: 1 },
      exportRendering: "horizontal-slice",
      exportHorizontalSliceEdgeRatio: 0.46
    }));
    expect(school_classicProfile.export.counters).toEqual({
      preset: "classic-label",
      congratulations: { text: "#18324c", surface: "#fffaf0", outline: "#b58a3a" },
      photos: { text: "#365b4c", surface: "#eef3ed", outline: "#365b4c" }
    });
  });

  it("keeps orange as the interface action accent", () => {
    expect(school_classicProfile.colors.accent).toBe("#e9652f");
    expect(school_classicProfile.metadata.accent).toBe("#e9652f");
  });
});
