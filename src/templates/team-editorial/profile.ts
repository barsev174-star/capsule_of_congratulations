import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/team-editorial/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (
  preset: "portrait-shadow-frame" | "landscape-shadow-frame" | "landscape-shadow-frame-feature",
  base: `/templates/team-editorial/${string}`,
  overlay: `/templates/team-editorial/${string}`,
  width: number,
  height: number,
  minScale = 0.7
) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: {
    maxChars: 45 as const,
    maxLines: 2 as const,
    align: "center" as const,
    fontToken: "body" as const,
    fontStyle: "italic" as const,
    fontScale: 1.05,
    minScale,
    layout: "standard" as const
  }
});

export const team_editorialProfile = defineTemplate({
  id: "team-editorial",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Вместе",
    description: "Универсальная редакционная открытка с тактильной бумагой, строгим тёмно-синим и тёплыми предметными акцентами.",
    accent: "#2f6f70",
    preview: asset("/templates/team-editorial/preview-v3.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/team-editorial/page.webp", 1536, 1024),
    sections: {
      hero: defineSectionUnderlay(asset("/templates/team-editorial/page.webp", 1536, 1024), "cover"),
      summary: defineSectionUnderlay(asset("/templates/team-editorial/section-summary.webp", 1200, 420), "adaptive-frame", {
        slices: { top: 0.38, right: 0.16, bottom: 0.4, left: 0.12 },
        safeArea: { x: 0.17, y: 0.09, width: 0.72, height: 0.82 }
      }),
      qualities: defineSectionUnderlay(asset("/templates/team-editorial/page.webp", 1536, 1024), "cover"),
      messages: defineSectionUnderlay(asset("/templates/team-editorial/section-messages.webp", 1200, 900), "adaptive-frame", {
        mobileAsset: asset("/templates/team-editorial/section-messages-mobile.webp", 600, 900),
        safeArea: { x: 0.075, y: 0.06, width: 0.85, height: 0.88 }
      }),
      memories: defineSectionUnderlay(asset("/templates/team-editorial/section-memories-v2.webp", 1200, 680), "adaptive-frame", {
        mobileAsset: asset("/templates/team-editorial/section-memories-mobile-v2.webp", 600, 900),
        safeArea: { x: 0.035, y: 0.045, width: 0.93, height: 0.91 }
      }),
      quotes: defineSectionUnderlay(asset("/templates/team-editorial/page.webp", 1536, 1024), "cover"),
      closing: defineSectionUnderlay(asset("/templates/team-editorial/section-closing.webp", 1200, 460), "cover", {
        mobileAsset: asset("/templates/team-editorial/section-closing-mobile.webp", 600, 780),
        safeArea: { x: 0.12, y: 0.1, width: 0.76, height: 0.74 },
        focalPoint: { x: 0.5, y: 1 },
        exportRendering: "horizontal-slice",
        exportHorizontalSliceEdgeRatio: 0.34
      })
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/team-editorial/greeting-card-1.webp", 1200, 500), "adaptive-frame", { slices: { top: 0.34, right: 0.13, bottom: 0.12, left: 0.12 }, safeArea: { x: 0.11, y: 0.13, width: 0.8, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/team-editorial/greeting-card-2.webp", 1200, 500), "adaptive-frame", { slices: { top: 0.34, right: 0.13, bottom: 0.12, left: 0.12 }, safeArea: { x: 0.11, y: 0.13, width: 0.8, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/team-editorial/greeting-card-3.webp", 1200, 500), "adaptive-frame", { slices: { top: 0.34, right: 0.13, bottom: 0.12, left: 0.12 }, safeArea: { x: 0.11, y: 0.13, width: 0.8, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/team-editorial/greeting-card-4.webp", 1200, 500), "adaptive-frame", { slices: { top: 0.34, right: 0.13, bottom: 0.12, left: 0.12 }, safeArea: { x: 0.11, y: 0.13, width: 0.8, height: 0.72 } })
    ],
    qualityCards: [1, 2, 3, 4, 5].map((index) =>
      defineTextCard(asset(`/templates/team-editorial/quality-card-${index}.webp`, 480, 258), "quality-plaque-artwork", {
        textColor: index === 3 || index === 5 ? "#14283b" : "#fffaf2"
      })
    ),
    exportQualityCards: [1, 2, 3, 4, 5].map((index) =>
      defineTextCard(asset(`/templates/team-editorial/quality-card-${index}-export.webp`, 720, 180), "quality-plaque-export-artwork", {
        textColor: index === 3 || index === 5 ? "#14283b" : "#fffaf2"
      })
    ),
    quoteCards: [1, 2, 3].map((index) =>
      defineTextCard(asset(`/templates/team-editorial/quote-card-${index}.webp`, 800, 640), "quote-panel-artwork", { textColor: "#14283b" })
    ),
    exportQuoteCards: [1, 2, 3].map((index) =>
      defineTextCard(asset(`/templates/team-editorial/quote-card-${index}-export-v3.webp`, 720, 180), "quote-panel-export-artwork", { textColor: "#14283b" })
    ),
    photoFrames: {
      messagePortrait: frame("portrait-shadow-frame", "/templates/team-editorial/photo-frame-portrait-base-v3.webp", "/templates/team-editorial/photo-frame-portrait-overlay-v3.webp", 802, 1122, 0.76),
      messageLandscape: frame("landscape-shadow-frame", "/templates/team-editorial/photo-frame-landscape-base-v3.webp", "/templates/team-editorial/photo-frame-landscape-overlay-v3.webp", 1122, 802, 0.76),
      memory: frame("landscape-shadow-frame-feature", "/templates/team-editorial/photo-frame-memory-base-v2.webp", "/templates/team-editorial/photo-frame-memory-overlay-v2.webp", 1122, 802, 0.76)
    },
    decor: [
      { id: "hero-left-editorial-desktop", asset: asset("/templates/team-editorial/hero-left-v2.webp", 720, 1080), anchor: "hero", rect: { x: -0.055, y: 0.015, width: 0.34, height: 0.98 }, rotation: -2, opacity: 0.99, visibleOn: ["desktop"] },
      { id: "hero-right-editorial-desktop", asset: asset("/templates/team-editorial/hero-right-v2.webp", 720, 1080), anchor: "hero", rect: { x: 0.64, y: 0.085, width: 0.515, height: 1 }, rotation: 21, opacity: 0.98, visibleOn: ["desktop"] },
      {
        id: "hero-left-editorial-export",
        asset: asset("/templates/team-editorial/hero-left-v2.webp", 720, 1080),
        anchor: "hero",
        rect: { x: -0.04, y: 0.02, width: 0.32, height: 0.98 },
        rotation: -2,
        opacity: 0.99,
        visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: -0.04, y: 0.02, width: 0.32, height: 0.98 }, rotation: -2, opacity: 0.99 },
          post: { rect: { x: -0.05, y: 0.08, width: 0.29, height: 1.45 }, rotation: -7, opacity: 0.99 },
          a4: { rect: { x: -0.045, y: 0.06, width: 0.3, height: 1.35 }, rotation: -2, opacity: 0.99 }
        }
      },
      {
        id: "hero-right-editorial-export",
        asset: asset("/templates/team-editorial/hero-right-v2.webp", 720, 1080),
        anchor: "hero",
        rect: { x: 0.72, y: 0.04, width: 0.38, height: 0.98 },
        rotation: 2,
        opacity: 0.98,
        visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: 0.72, y: 0.04, width: 0.38, height: 1.13 }, rotation: 29, opacity: 0.98 },
          post: { rect: { x: 0.7, y: 0.1, width: 0.41, height: 1.595 }, rotation: 24, opacity: 0.98 },
          a4: { rect: { x: 0.71, y: 0.08, width: 0.38, height: 1.465 }, rotation: 37, opacity: 0.98 }
        }
      },
      { id: "hero-left-editorial-mobile", asset: asset("/templates/team-editorial/hero-left-v2.webp", 720, 1080), anchor: "hero", rect: { x: 0, y: 0.53, width: 0.215, height: 0.655 }, rotation: -13, opacity: 0.96, visibleOn: [] },
      { id: "hero-right-editorial-mobile", asset: asset("/templates/team-editorial/hero-right-v2.webp", 720, 1080), anchor: "hero", rect: { x: 0.785, y: -0.07, width: 0.29, height: 0.43 }, rotation: 29, opacity: 0.95, visibleOn: ["mobile"] }
    ]
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "Inter", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#f6f1e8", text: "#14283b", muted: "#657077", accent: "#2f6f70", occasion: "#c8643f", action: "#2f6f70", surface: "#fffaf2",
    surfaces: { hero: "#f6f1e8", summary: "#fffaf2", qualities: "#f6f1e8", messages: "#f8f4ec", memories: "#2b5260", quotes: "#f6f1e8", closing: "#f6f1e8" },
    sections: { memories: { text: "#fffaf2", muted: "#d8e5e1" } }
  },
  intro: {
    surface: "#f6f1e8",
    text: "#14283b",
    accent: "#2f6f70",
    preset: "classic",
    kicker: "Открытка для важного человека",
    decor: [asset("/templates/team-editorial/hero-left-v2.webp", 720, 1080), asset("/templates/team-editorial/hero-right-v2.webp", 720, 1080)]
  },
  motion: { preset: "calm", revealSections: true, photoViewer: true },
  copy: { qualitiesTitle: "За что тебя ценят", messagesTitle: "Поздравления", quotesTitle: "Фразы, которые останутся" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"], heroDescription: "Публичная часть подарка:\nважные слова, фотографии и общие моменты." },
  export: {
    profile: "universal-export-v1",
    heroDescriptionMaxWidth: { story: 520, post: 520, a4: 480 },
    counters: {
      preset: "classic-label",
      congratulations: { text: "#fffaf2", surface: "#2f6f70", outline: "#2f6f70" },
      photos: { text: "#14283b", surface: "#fffaf2", outline: "#2f6f70" }
    },
    closingLayout: {
      story: { contentWidthPercent: 64, headingFontSize: 30, bodyFontSize: 21, brandMarginTop: 10, logoWidth: 132, logoHeight: 30, taglineFontSize: 17 },
      post: { contentWidthPercent: 76, headingFontSize: 28, bodyFontSize: 17, brandMarginTop: 8, logoWidth: 110, logoHeight: 25, taglineFontSize: 14 },
      a4: { contentWidthPercent: 72, headingFontSize: 31, bodyFontSize: 19, brandMarginTop: 8, logoWidth: 130, logoHeight: 30, taglineFontSize: 16 }
    }
  },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 82_000_000 },
  demo: { fixture: "full-card-default", scenario: "landscape-trio", photoCount: 3 }
});
