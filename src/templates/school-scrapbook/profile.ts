import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/school-scrapbook/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: `/templates/school-scrapbook/${string}`, overlay: `/templates/school-scrapbook/${string}`, width: number, height: number) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.7 }
});

export const school_scrapbookProfile = defineTemplate({
  id: "school-scrapbook",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Школьный коллаж",
    description: "Яркая школьная история из тетрадной бумаги, стикеров и памятных фотографий.",
    accent: "#1859bd",
    preview: asset("/templates/school-scrapbook/preview.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/school-scrapbook/page.webp", 1536, 1024),
    sections: {
      hero: defineSectionUnderlay(asset("/templates/school-scrapbook/section-hero.webp", 1200, 670), "adaptive-frame"),
      summary: defineSectionUnderlay(asset("/templates/school-scrapbook/section-summary-featured-desktop-v3.webp", 1200, 360), "cover", {
        mobileAsset: asset("/templates/school-scrapbook/section-summary-featured-mobile-v3.webp", 600, 800),
        safeArea: { x: 0.18, y: 0.1, width: 0.64, height: 0.8 }
      }),
      qualities: defineSectionUnderlay(asset("/templates/school-scrapbook/section-qualities.webp", 1200, 670), "adaptive-frame"),
      messages: defineSectionUnderlay(asset("/templates/school-scrapbook/section-messages-doodles-desktop-v3.webp", 1200, 900), "cover", {
        mobileAsset: asset("/templates/school-scrapbook/section-messages-doodles-mobile-v3.webp", 600, 1000),
        safeArea: { x: 0.065, y: 0.08, width: 0.87, height: 0.8 }
      }),
      memories: defineSectionUnderlay(asset("/templates/school-scrapbook/section-memories.webp", 1200, 670), "adaptive-frame", {
        safeArea: { x: 0.04, y: 0.075, width: 0.92, height: 0.85 }
      }),
      quotes: defineSectionUnderlay(asset("/templates/school-scrapbook/section-quotes.webp", 1200, 670), "adaptive-frame"),
      closing: defineSectionUnderlay(asset("/templates/school-scrapbook/section-closing-finale-desktop-v3.webp", 1200, 480), "cover", {
        mobileAsset: asset("/templates/school-scrapbook/section-closing-finale-mobile-v3.webp", 600, 800)
      })
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-1-v3.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-2-v3.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-3-v3.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-4-v3.webp", 1200, 400), "adaptive-frame")
    ],
    qualityCards: [
      defineTextCard(asset("/templates/school-scrapbook/quality-card-1-v2.webp", 480, 258), "quality-pill"),
      defineTextCard(asset("/templates/school-scrapbook/quality-card-2-v2.webp", 480, 258), "quality-pill"),
      defineTextCard(asset("/templates/school-scrapbook/quality-card-3-v2.webp", 480, 258), "quality-pill"),
      defineTextCard(asset("/templates/school-scrapbook/quality-card-4-v2.webp", 480, 258), "quality-pill"),
      defineTextCard(asset("/templates/school-scrapbook/quality-card-5-v2.webp", 480, 258), "quality-pill")
    ],
    quoteCards: [
      defineTextCard(asset("/templates/school-scrapbook/quote-card-v3.webp", 800, 640), "quote-panel-compact")
    ],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/school-scrapbook/photo-frame-portrait-v3-base.webp", "/templates/school-scrapbook/photo-frame-portrait-v3-overlay.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/school-scrapbook/photo-frame-landscape-v3-base.webp", "/templates/school-scrapbook/photo-frame-landscape-v3-overlay.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/school-scrapbook/photo-frame-landscape-v3-base.webp", "/templates/school-scrapbook/photo-frame-landscape-v3-overlay.webp", 1122, 802)
    },
    decor: [
      {
        id: "hero-globe-cluster",
        asset: asset("/templates/school-scrapbook/decor-hero-globe-cluster-v1.webp", 220, 231),
        anchor: "hero",
        rect: { x: -0.025, y: 0.125, width: 0.32, height: 0.95 },
        rotation: -4,
        opacity: 0.9,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "hero-backpack-cluster",
        asset: asset("/templates/school-scrapbook/decor-hero-backpack-cluster-v1.webp", 224, 149),
        anchor: "hero",
        rect: { x: 0.595, y: 0.27, width: 0.47, height: 0.785 },
        rotation: -4,
        opacity: 0.8,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "summary-blue-rays-left",
        asset: asset("/templates/school-scrapbook/decor-summary-blue-rays-v1.webp", 96, 89),
        anchor: "summary",
        rect: { x: -0.14, y: 0.245, width: 0.2, height: 0.585 },
        rotation: -133,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "summary-blue-rays-right",
        asset: asset("/templates/school-scrapbook/decor-summary-blue-rays-v1.webp", 96, 89),
        anchor: "summary",
        rect: { x: 0.93, y: 0.27, width: 0.24, height: 0.585 },
        rotation: 37,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "closing-grade-5plus",
        asset: asset("/templates/school-scrapbook/decor-closing-grade-5plus-v1.webp", 224, 149),
        anchor: "closing",
        rect: { x: 0.74, y: 0.075, width: 0.275, height: 0.545 },
        rotation: 25,
        opacity: 0.8,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "closing-student-doodle",
        asset: asset("/templates/school-scrapbook/decor-closing-student-doodle-v1.webp", 112, 112),
        anchor: "closing",
        rect: { x: 0.19, y: 0.295, width: 0.09, height: 0.54 },
        rotation: -7,
        opacity: 0.92,
        visibleOn: ["desktop", "export"]
      },
      {
        id: "closing-student-girl-doodle",
        asset: asset("/templates/school-scrapbook/decor-closing-student-girl-doodle-v3.webp", 105, 112),
        anchor: "closing",
        rect: { x: 0.7, y: 0.295, width: 0.084, height: 0.54 },
        rotation: 5,
        opacity: 0.92,
        visibleOn: ["desktop", "export"]
      }
    ]
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "PT Sans", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#f6f0e3", text: "#16365c", muted: "#53677d", accent: "#1859bd", surface: "#fffaf0",
    surfaces: {
      hero: "#fffaf0",
      summary: "#eef7f5",
      qualities: "#fff7d6",
      messages: "#edf5ff",
      memories: "#eff8f2",
      quotes: "#f5effb",
      closing: "#eaf3fb"
    }
  },
  intro: { surface: "#fffaf0", text: "#16365c", accent: "#1859bd" },
  motion: { preset: "playful", revealSections: true, photoViewer: true },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});
