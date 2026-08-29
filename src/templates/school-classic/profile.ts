import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/school-classic/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: `/templates/school-classic/${string}`, overlay: `/templates/school-classic/${string}`, width: number, height: number, layout?: "standard" | "expanded") => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.7, ...(layout ? { layout } : {}) }
});

export const school_classicProfile = defineTemplate({
  id: "school-classic",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Школьный классический",
    description: "Классическая открытка учителю с предметной школьной композицией, архивной бумагой и золотыми фотоуголками.",
    accent: "#7a1f2b",
    preview: asset("/templates/school-classic/preview-v6.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/school-classic/page-v2.webp", 1536, 1024),
    sections: {
      hero: defineSectionUnderlay(asset("/templates/school-classic/page-v2.webp", 1536, 1024), "cover"),
      summary: defineSectionUnderlay(asset("/templates/school-classic/section-summary-desktop-v5.webp", 1200, 360), "cover", { mobileAsset: asset("/templates/school-classic/section-summary-mobile-v5.webp", 600, 800), safeArea: { x: 0.14, y: 0.07, width: 0.72, height: 0.84 } }),
      qualities: defineSectionUnderlay(asset("/templates/school-classic/page-v2.webp", 1536, 1024), "cover"),
      messages: defineSectionUnderlay(asset("/templates/school-classic/section-messages-v2.webp", 1200, 900), "adaptive-frame", { safeArea: { x: 0.105, y: 0.055, width: 0.83, height: 0.89 } }),
      memories: defineSectionUnderlay(asset("/templates/school-classic/section-memories-v10.webp", 1200, 670), "adaptive-frame", { safeArea: { x: 0.05, y: 0.08, width: 0.9, height: 0.84 } }),
      quotes: defineSectionUnderlay(asset("/templates/school-classic/page-v2.webp", 1536, 1024), "cover"),
      closing: defineSectionUnderlay(asset("/templates/school-classic/section-closing-desktop-v4.webp", 1200, 480), "cover", { mobileAsset: asset("/templates/school-classic/section-closing-mobile-v5.webp", 600, 800), safeArea: { x: 0.08, y: 0.08, width: 0.84, height: 0.78 }, focalPoint: { x: 0.5, y: 1 }, exportRendering: "horizontal-slice", exportHorizontalSliceEdgeRatio: 0.46 })
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/school-classic/greeting-card-1-v4.webp", 1200, 500), "adaptive-frame", { safeArea: { x: 0.105, y: 0.115, width: 0.82, height: 0.77 } }),
      defineSectionUnderlay(asset("/templates/school-classic/greeting-card-2-v4.webp", 1200, 500), "adaptive-frame", { safeArea: { x: 0.105, y: 0.115, width: 0.82, height: 0.77 } }),
      defineSectionUnderlay(asset("/templates/school-classic/greeting-card-3-v4.webp", 1200, 500), "adaptive-frame", { safeArea: { x: 0.105, y: 0.115, width: 0.82, height: 0.77 } }),
      defineSectionUnderlay(asset("/templates/school-classic/greeting-card-4-v4.webp", 1200, 500), "adaptive-frame", { safeArea: { x: 0.105, y: 0.115, width: 0.82, height: 0.77 } })
    ],
    qualityCards: [
      defineTextCard(asset("/templates/school-classic/quality-card-1-v3.webp", 480, 258), "quality-plaque-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-2-v3.webp", 480, 258), "quality-plaque-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-3-v3.webp", 480, 258), "quality-plaque-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-4-v3.webp", 480, 258), "quality-plaque-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-5-v3.webp", 480, 258), "quality-plaque-artwork", { textColor: "#18324c" })
    ],
    exportQualityCards: [
      defineTextCard(asset("/templates/school-classic/quality-card-1-export-v3.webp", 720, 180), "quality-plaque-export-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-2-export-v3.webp", 720, 180), "quality-plaque-export-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-3-export-v3.webp", 720, 180), "quality-plaque-export-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-4-export-v3.webp", 720, 180), "quality-plaque-export-artwork", { textColor: "#fffaf0" }),
      defineTextCard(asset("/templates/school-classic/quality-card-5-export-v3.webp", 720, 180), "quality-plaque-export-artwork", { textColor: "#18324c" })
    ],
    quoteCards: [
      defineTextCard(asset("/templates/school-classic/quote-card-1-v4.webp", 800, 640), "quote-panel-artwork"),
      defineTextCard(asset("/templates/school-classic/quote-card-2-v4.webp", 800, 640), "quote-panel-artwork"),
      defineTextCard(asset("/templates/school-classic/quote-card-3-v4.webp", 800, 640), "quote-panel-artwork")
    ],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/school-classic/photo-frame-portrait-v2-base.webp", "/templates/school-classic/photo-frame-portrait-v2-overlay.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/school-classic/photo-frame-landscape-v2-base.webp", "/templates/school-classic/photo-frame-landscape-v2-overlay.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/school-classic/photo-frame-landscape-v2-base.webp", "/templates/school-classic/photo-frame-landscape-v2-overlay.webp", 1122, 802, "expanded")
    },
    decor: [
      { id: "hero-left-classic-desktop", asset: asset("/templates/school-classic/decor-hero-left-v4.webp", 720, 900), anchor: "hero", rect: { x: -0.09, y: 0.09, width: 0.35, height: 0.9 }, opacity: 1, rotation: -7, visibleOn: ["desktop"] },
      { id: "hero-right-classic-desktop", asset: asset("/templates/school-classic/decor-hero-right-v3.webp", 720, 900), anchor: "hero", rect: { x: 0.745, y: 0.04, width: 0.37, height: 1 }, opacity: 0.99, visibleOn: ["desktop"] },
      {
        id: "hero-left-classic-export",
        asset: asset("/templates/school-classic/decor-hero-left-v4.webp", 720, 900),
        anchor: "hero",
        rect: { x: -0.09, y: 0.115, width: 0.425, height: 1 },
        opacity: 0.99,
        rotation: -5,
        visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: -0.09, y: 0.115, width: 0.425, height: 1 }, opacity: 0.99, rotation: -5 },
          post: { rect: { x: -0.09, y: 0.115, width: 0.425, height: 1.45 }, opacity: 0.99, rotation: -5 },
          a4: { rect: { x: -0.09, y: 0.1, width: 0.425, height: 1.45 }, opacity: 0.99, rotation: -5 }
        }
      },
      {
        id: "hero-right-classic-export",
        asset: asset("/templates/school-classic/decor-hero-right-v3.webp", 720, 900),
        anchor: "hero",
        rect: { x: 0.615, y: 0.09, width: 0.55, height: 1 },
        opacity: 0.99,
        visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: 0.615, y: 0.09, width: 0.55, height: 1 }, opacity: 0.99, rotation: 0 },
          post: { rect: { x: 0.615, y: 0.09, width: 0.55, height: 1.45 }, opacity: 0.99, rotation: 0 },
          a4: { rect: { x: 0.615, y: 0.075, width: 0.55, height: 1.45 }, opacity: 0.99, rotation: 0 }
        }
      },
      { id: "hero-left-classic-mobile", asset: asset("/templates/school-classic/decor-hero-left-mobile-v6.webp", 720, 900), anchor: "hero", rect: { x: -0.14, y: 0.165, width: 0.4, height: 0.44 }, opacity: 0.97, rotation: -5, visibleOn: ["mobile"] },
      { id: "hero-right-classic-mobile", asset: asset("/templates/school-classic/decor-hero-right-v3.webp", 720, 900), anchor: "hero", rect: { x: 0.735, y: 0.14, width: 0.5, height: 0.515 }, opacity: 0.97, visibleOn: ["mobile"] }
    ]
  },
  typography: { heading: { family: "PT Sans", weight: 700 }, body: { family: "PT Sans", weight: 400 }, handwritten: { family: "Caveat", weight: 600 } },
  colors: {
    page: "#fffaf0", text: "#18324c", muted: "#5f6f68", accent: "#7a1f2b", surface: "#fffaf0",
    surfaces: { hero: "#fffaf0", summary: "#eef2e9", qualities: "#f7f1df", messages: "#edf2f5", memories: "#eef3ed", quotes: "#f4ebed", closing: "#fffaf0" }
  },
  intro: {
    surface: "#fffaf0", text: "#18324c", accent: "#7a1f2b", preset: "classic", visualPreset: "school-formal", kicker: "Открытка учителю",
    decor: [asset("/templates/school-classic/decor-hero-left-v4.webp", 720, 900), asset("/templates/school-classic/decor-hero-right-v3.webp", 720, 900)]
  },
  motion: { preset: "calm", revealSections: true, photoViewer: true },
  public: { blocks: ["hero", "qualities", "memories", "quotes"], heroDescription: "Публичная часть подарка учителю:\nважные слова, фотографии и школьные воспоминания." },
  export: {
    profile: "universal-export-v1",
    heroDescriptionMaxWidth: { story: 520, post: 520, a4: 480 },
    counters: {
      preset: "classic-label",
      congratulations: { text: "#18324c", surface: "#fffaf0", outline: "#b58a3a" },
      photos: { text: "#365b4c", surface: "#eef3ed", outline: "#365b4c" }
    },
    closingLayout: {
      story: { contentWidthPercent: 64, headingFontSize: 30, bodyFontSize: 21, brandMarginTop: 10, logoWidth: 132, logoHeight: 30, taglineFontSize: 17 },
      post: { contentWidthPercent: 76, headingFontSize: 28, bodyFontSize: 17, brandMarginTop: 8, logoWidth: 110, logoHeight: 25, taglineFontSize: 14 },
      a4: { contentWidthPercent: 72, headingFontSize: 31, bodyFontSize: 19, brandMarginTop: 8, logoWidth: 130, logoHeight: 30, taglineFontSize: 16 }
    }
  },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 72_000_000 },
  demo: { fixture: "teacher-classic" }
});
