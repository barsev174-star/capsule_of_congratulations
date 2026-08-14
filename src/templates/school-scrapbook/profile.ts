import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/school-scrapbook/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: `/templates/school-scrapbook/${string}`, overlay: `/templates/school-scrapbook/${string}`, width: number, height: number) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.5 }
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
      summary: defineSectionUnderlay(asset("/templates/school-scrapbook/section-summary.webp", 1200, 670), "adaptive-frame"),
      qualities: defineSectionUnderlay(asset("/templates/school-scrapbook/section-qualities.webp", 1200, 670), "adaptive-frame"),
      messages: defineSectionUnderlay(asset("/templates/school-scrapbook/section-messages.webp", 1200, 670), "adaptive-frame"),
      memories: defineSectionUnderlay(asset("/templates/school-scrapbook/section-memories.webp", 1200, 670), "adaptive-frame"),
      quotes: defineSectionUnderlay(asset("/templates/school-scrapbook/section-quotes.webp", 1200, 670), "adaptive-frame"),
      closing: defineSectionUnderlay(asset("/templates/school-scrapbook/section-closing.webp", 1200, 670), "adaptive-frame")
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-1.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-2.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-3.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/school-scrapbook/greeting-card-4.webp", 1200, 400), "adaptive-frame")
    ],
    qualityCards: [defineTextCard(asset("/templates/school-scrapbook/quality-card.webp", 480, 258), "quality-pill")],
    quoteCards: [defineTextCard(asset("/templates/school-scrapbook/quote-card.webp", 1402, 1122), "quote-panel")],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/school-scrapbook/photo-frame-portrait-base.webp", "/templates/school-scrapbook/photo-frame-portrait-overlay.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/school-scrapbook/photo-frame-landscape-base.webp", "/templates/school-scrapbook/photo-frame-landscape-overlay.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/school-scrapbook/photo-frame-landscape-base.webp", "/templates/school-scrapbook/photo-frame-landscape-overlay.webp", 1122, 802)
    },
    decor: []
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "PT Sans", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#f6f0e3", text: "#16365c", muted: "#53677d", accent: "#e9652f", surface: "#fffaf0",
    surfaces: { hero: "#fffaf0", summary: "#fffaf0", qualities: "#fffaf0", messages: "#fffaf0", memories: "#fffaf0", quotes: "#fffaf0", closing: "#fffaf0" }
  },
  intro: { surface: "#fffaf0", text: "#16365c", accent: "#1859bd" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});
