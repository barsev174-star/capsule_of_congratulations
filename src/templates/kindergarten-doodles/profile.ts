import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/kindergarten-doodles/${string}`, width: number, height: number) => ({ src, width, height });
const captionPaperFrame = (preset: "portrait-caption-paper" | "landscape-caption-paper", minScale = 0.7, paper: "yellow-blue" | "mint-coral" = "yellow-blue", exportUnderlay?: ReturnType<typeof asset>) => ({
  preset,
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale, layout: "standard" as const, paper, exportUnderlay }
});

export const kindergarten_doodlesProfile = defineTemplate({
  id: "kindergarten-doodles",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Детство в рисунках",
    description: "Тёплая открытка воспитателю с детскими рисунками, мягкой акварелью и живыми фотографиями группы.",
    accent: "#ef7665",
    preview: asset("/templates/kindergarten-doodles/preview.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/kindergarten-doodles/page-v6.webp", 1536, 1024),
    sections: {
      hero: defineSectionUnderlay(asset("/templates/kindergarten-doodles/page-v6.webp", 1536, 1024), "cover"),
      summary: defineSectionUnderlay(asset("/templates/kindergarten-doodles/section-summary-desktop-v3.webp", 1200, 400), "adaptive-frame", {
        mobileAsset: asset("/templates/kindergarten-doodles/section-summary-mobile-v2.webp", 600, 800),
        safeArea: { x: 0.1, y: 0.12, width: 0.8, height: 0.76 }
      }),
      qualities: defineSectionUnderlay(asset("/templates/kindergarten-doodles/page-v6.webp", 1536, 1024), "cover"),
      messages: defineSectionUnderlay(asset("/templates/kindergarten-doodles/section-messages-v6.webp", 1200, 900), "adaptive-frame", {
        mobileAsset: asset("/templates/kindergarten-doodles/section-messages-mobile-v2.webp", 540, 900),
        safeArea: { x: 0.075, y: 0.06, width: 0.85, height: 0.88 }
      }),
      memories: defineSectionUnderlay(asset("/templates/kindergarten-doodles/section-memories-v2.webp", 1200, 670), "adaptive-frame", {
        mobileAsset: asset("/templates/kindergarten-doodles/section-memories-mobile-v1.webp", 540, 900),
        safeArea: { x: 0.06, y: 0.07, width: 0.88, height: 0.84 }
      }),
      quotes: defineSectionUnderlay(asset("/templates/kindergarten-doodles/page-v6.webp", 1536, 1024), "cover"),
      closing: defineSectionUnderlay(asset("/templates/kindergarten-doodles/section-closing-desktop-v7.webp", 1200, 480), "cover", {
        mobileAsset: asset("/templates/kindergarten-doodles/section-closing-mobile-v7.webp", 600, 800),
        safeArea: { x: 0.06, y: 0.03, width: 0.88, height: 0.94 },
        focalPoint: { x: 0.5, y: 1 },
        exportRendering: "horizontal-slice",
        exportHorizontalSliceEdgeRatio: 0.32
      })
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/kindergarten-doodles/greeting-card-1-v3.webp", 1200, 500), "adaptive-frame", { mobileAsset: asset("/templates/kindergarten-doodles/greeting-card-mobile-1-v2.webp", 540, 630), safeArea: { x: 0.12, y: 0.13, width: 0.76, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/kindergarten-doodles/greeting-card-2-v3.webp", 1200, 500), "adaptive-frame", { mobileAsset: asset("/templates/kindergarten-doodles/greeting-card-mobile-2-v2.webp", 540, 630), safeArea: { x: 0.12, y: 0.13, width: 0.76, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/kindergarten-doodles/greeting-card-3-v3.webp", 1200, 500), "adaptive-frame", { mobileAsset: asset("/templates/kindergarten-doodles/greeting-card-mobile-3-v2.webp", 540, 630), safeArea: { x: 0.12, y: 0.13, width: 0.76, height: 0.72 } }),
      defineSectionUnderlay(asset("/templates/kindergarten-doodles/greeting-card-4-v3.webp", 1200, 500), "adaptive-frame", { mobileAsset: asset("/templates/kindergarten-doodles/greeting-card-mobile-4-v2.webp", 540, 630), safeArea: { x: 0.12, y: 0.13, width: 0.76, height: 0.72 } })
    ],
    qualityCards: [1, 2, 3, 4, 5].map((index) => defineTextCard(asset(`/templates/kindergarten-doodles/quality-card-${index}-${index === 5 ? "v4" : "v2"}.webp`, 480, 330), "quality-doodle-poster", { textColor: "#18324c" })),
    exportQualityCards: [1, 2, 3, 4, 5].map((index) => defineTextCard(asset(`/templates/kindergarten-doodles/quality-card-${index}-export-${index === 5 ? "v5" : "v3"}.webp`, 720, 180), "quality-doodle-export", { textColor: "#18324c" })),
    quoteCards: [1, 2, 3].map((index) => defineTextCard(asset(`/templates/kindergarten-doodles/quote-card-${index}-v3.webp`, 800, 640), "quote-panel-artwork", { textColor: "#18324c" })),
    photoFrames: {
      messagePortrait: captionPaperFrame("portrait-caption-paper"),
      messageLandscape: captionPaperFrame("landscape-caption-paper"),
      memory: captionPaperFrame("landscape-caption-paper", 0.55, "mint-coral", asset("/templates/kindergarten-doodles/memory-caption-underlay-export-v1.webp", 400, 120))
    },
    decor: [
      { id: "hero-drawing-desktop", asset: asset("/templates/kindergarten-doodles/decor-hero-drawing-v5.webp", 720, 1080), anchor: "hero", rect: { x: -0.035, y: 0.025, width: 0.335, height: 0.96 }, rotation: -2, opacity: 0.99, visibleOn: ["desktop"] },
      { id: "hero-still-life-desktop", asset: asset("/templates/kindergarten-doodles/decor-hero-still-life.webp", 720, 900), anchor: "hero", rect: { x: 0.73, y: 0.035, width: 0.39, height: 0.98 }, opacity: 0.99, visibleOn: ["desktop"] },
      {
        id: "hero-drawing-export",
        asset: asset("/templates/kindergarten-doodles/decor-hero-drawing-v5.webp", 720, 1080),
        anchor: "hero",
        rect: { x: -0.005, y: 0.02, width: 0.29, height: 0.96 }, rotation: -2, opacity: 0.99, visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: 0, y: 0.02, width: 0.29, height: 0.96 }, opacity: 0.99, rotation: -2 },
          post: { rect: { x: 0, y: 0.105, width: 0.22, height: 1.38 }, opacity: 0.99, rotation: -2 },
          a4: { rect: { x: -0.05, y: 0.105, width: 0.32, height: 1.33 }, opacity: 0.99, rotation: -2 }
        }
      },
      {
        id: "hero-still-life-export",
        asset: asset("/templates/kindergarten-doodles/decor-hero-still-life.webp", 720, 900),
        anchor: "hero",
        rect: { x: 0.68, y: 0.05, width: 0.46, height: 1 }, opacity: 0.99, visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: 0.68, y: 0.05, width: 0.46, height: 1 }, opacity: 0.99, rotation: 0 },
          post: { rect: { x: 0.66, y: 0.05, width: 0.49, height: 1.4 }, opacity: 0.99, rotation: 0 },
          a4: { rect: { x: 0.66, y: 0.04, width: 0.49, height: 1.4 }, opacity: 0.99, rotation: 0 }
        }
      },
      { id: "hero-drawing-mobile", asset: asset("/templates/kindergarten-doodles/decor-hero-drawing-v5.webp", 720, 1080), anchor: "hero", rect: { x: -0.09, y: 0.085, width: 0.37, height: 0.63 }, rotation: -2, opacity: 0.98, visibleOn: ["mobile"] },
      { id: "hero-still-life-mobile", asset: asset("/templates/kindergarten-doodles/decor-hero-still-life.webp", 720, 900), anchor: "hero", rect: { x: 0.76, y: 0.19, width: 0.38, height: 0.49 }, opacity: 0.98, visibleOn: ["mobile"] }
    ]
  },
  typography: { heading: { family: "PT Sans", weight: 700 }, body: { family: "PT Sans", weight: 400 }, handwritten: { family: "Caveat", weight: 600 } },
  colors: {
    page: "#f8f1e8", text: "#18324c", muted: "#617079", accent: "#ef7665", occasion: "#3f7f95", surface: "#fffaf4",
    surfaces: { hero: "#f8f1e8", summary: "#fffaf4", qualities: "#fbf4e9", messages: "#fbf4e9", memories: "#eaf6fb", quotes: "#f8f1e8", closing: "#f8f1e8" }
  },
  intro: {
    surface: "#f8f1e8", text: "#18324c", accent: "#ef7665", preset: "scrapbook", visualPreset: "caregiver-playful", kicker: "Открытка воспитателю",
    decor: [asset("/templates/kindergarten-doodles/decor-hero-drawing-v5.webp", 720, 1080), asset("/templates/kindergarten-doodles/decor-hero-still-life.webp", 720, 900)]
  },
  motion: { preset: "playful", revealSections: true, photoViewer: true },
  copy: { qualitiesTitle: "За что Вас ценят", quotesTitle: "Лучшие фразы" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"], heroDescription: "Тёплая публичная часть подарка воспитателю:\nдобрые слова, детские улыбки и общие моменты." },
  export: {
    profile: "universal-export-v1",
    memoriesHeadingUnderlay: asset("/templates/kindergarten-doodles/memories-heading-underlay-export-v1.webp", 320, 80),
    heroDescriptionMaxWidth: { story: 500, post: 500, a4: 470 },
    counters: {
      preset: "classic-label",
      congratulations: { text: "#295d58", surface: "#d8eee2", outline: "#73ad92" },
      photos: { text: "#315e76", surface: "#dbeaf1", outline: "#76a9c0" }
    }
  },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 72_000_000 },
  demo: { fixture: "kindergarten-demo", scenario: "landscape-pair", photoCount: 2 }
});
