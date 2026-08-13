import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/northern-light/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: `/templates/northern-light/${string}`, overlay: `/templates/northern-light/${string}`, width: number, height: number) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.7 }
});

export const northern_lightProfile = defineTemplate({
  id: "northern-light",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Северное сияние",
    description: "Светлая история о важных людях в сиянии холодного ночного неба.",
    accent: "#6558e8",
    preview: asset("/templates/northern-light/preview.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/northern-light/page.webp", 1536, 1024),
    sections: {
      summary: defineSectionUnderlay(asset("/templates/northern-light/hero.webp", 1376, 768), "bottom-edge", { opacity: 0.34 }),
      messages: defineSectionUnderlay(asset("/templates/northern-light/hero.webp", 1376, 768), "bottom-edge", { opacity: 0.34 }),
      memories: defineSectionUnderlay(asset("/templates/northern-light/hero.webp", 1376, 768), "bottom-edge", { opacity: 0.34 }),
      closing: defineSectionUnderlay(asset("/templates/northern-light/hero.webp", 1376, 768), "bottom-edge", { opacity: 0.34 })
    },
    greetingCards: [],
    qualityCards: [defineTextCard(asset("/templates/northern-light/quality-card.webp", 480, 258), "quality-pill")],
    quoteCards: [defineTextCard(asset("/templates/northern-light/quote-card.webp", 1402, 1122), "quote-panel")],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/northern-light/photo-frame-portrait-base.webp", "/templates/northern-light/photo-frame-portrait-overlay.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/northern-light/photo-frame-landscape-base.webp", "/templates/northern-light/photo-frame-landscape-overlay.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/northern-light/photo-frame-landscape-base.webp", "/templates/northern-light/photo-frame-landscape-overlay.webp", 1122, 802)
    },
    decor: []
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "Inter", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#0b1637", text: "#f5f7ff", muted: "#c8d2ed", accent: "#ff7a59", surface: "#172655",
    surfaces: { hero: "#13234d", qualities: "#172655", memories: "#102044", quotes: "#1a2855", closing: "#0d1b3c" }
  },
  intro: { surface: "#0b1637", text: "#f5f7ff", accent: "#20c7c9" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});
