import type { NormalizedRect } from "@/lib/templates/profile";

export const universalTextCardPresetIds = ["quality-pill", "quote-panel"] as const;
export type UniversalTextCardPresetId = (typeof universalTextCardPresetIds)[number];

export type UniversalTextCardPreset = {
  id: UniversalTextCardPresetId;
  label: string;
  description: string;
  source: { width: number; height: number };
  textArea: NormalizedRect;
};

export const universalTextCardPresets: Readonly<Record<UniversalTextCardPresetId, UniversalTextCardPreset>> = {
  "quality-pill": {
    id: "quality-pill",
    label: "Карточка качества",
    description: "Стандарт 480 × 258 с центральной безопасной областью для короткого качества.",
    source: { width: 480, height: 258 },
    textArea: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 }
  },
  "quote-panel": {
    id: "quote-panel",
    label: "Карточка цитаты",
    description: "Стандарт 1402 × 1122 с местом для кавычки и многострочной фразы.",
    source: { width: 1402, height: 1122 },
    textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 }
  }
};

export const getUniversalTextCardPreset = (id: UniversalTextCardPresetId) =>
  universalTextCardPresets[id];
