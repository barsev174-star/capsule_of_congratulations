import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: `/templates/daylight-proof/${string}`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: `/templates/daylight-proof/${string}`, overlay: `/templates/daylight-proof/${string}`, width: number, height: number) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.7 }
});

export const daylight_proofProfile = defineTemplate({
  id: "daylight-proof",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Дневной коллаж — тест",
    description: "Контрольная смена оформления: дневной коллаж без правок универсального renderer.",
    accent: "#126f8f",
    preview: asset("/templates/daylight-proof/preview.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/daylight-proof/page.webp", 1536, 1024),
    sections: {
      summary: defineSectionUnderlay(asset("/templates/daylight-proof/section-summary.webp", 1200, 670), "adaptive-frame"),
      messages: defineSectionUnderlay(asset("/templates/daylight-proof/section-messages.webp", 1200, 670), "adaptive-frame"),
      memories: defineSectionUnderlay(asset("/templates/daylight-proof/section-memories.webp", 1200, 670), "adaptive-frame"),
      closing: defineSectionUnderlay(asset("/templates/daylight-proof/section-closing.webp", 1200, 670), "adaptive-frame")
    },
    greetingCards: Array.from({ length: 4 }, (_, index) => defineSectionUnderlay(
      asset(`/templates/daylight-proof/greeting-card-${index + 1}.webp` as `/templates/daylight-proof/${string}`, 1200, 400),
      "adaptive-frame"
    )),
    qualityCards: [defineTextCard(asset("/templates/daylight-proof/quality-card.webp", 480, 258), "quality-pill")],
    quoteCards: [defineTextCard(asset("/templates/daylight-proof/quote-card.webp", 1402, 1122), "quote-panel")],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/daylight-proof/photo-frame-portrait-base-collage.webp", "/templates/daylight-proof/photo-frame-portrait-overlay-collage.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/daylight-proof/photo-frame-landscape-base-collage.webp", "/templates/daylight-proof/photo-frame-landscape-overlay-collage.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/daylight-proof/photo-frame-landscape-base-collage.webp", "/templates/daylight-proof/photo-frame-landscape-overlay-collage.webp", 1122, 802)
    },
    decor: []
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "Inter", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#dff5f2", text: "#102c3a", muted: "#456a78", accent: "#e9652f", surface: "#fffdf7",
    surfaces: { hero: "#fffdf7", summary: "#fffdf7", qualities: "#fffdf7", messages: "#fffdf7", memories: "#fffdf7", quotes: "#fffdf7", closing: "#fffdf7" }
  },
  intro: { surface: "#fffdf7", text: "#102c3a", accent: "#126f8f" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});
