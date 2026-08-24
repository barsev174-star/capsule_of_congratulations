import type { NormalizedRect } from "@/lib/templates/profile";

export const universalTextCardPresetIds = [
  "quality-pill",
  "quality-pill-export",
  "quality-plaque-artwork",
  "quality-plaque-export-artwork",
  "quality-doodle-poster",
  "quality-doodle-export",
  "quote-panel",
  "quote-panel-compact",
  "quote-panel-artwork"
] as const;
export type UniversalTextCardPresetId = (typeof universalTextCardPresetIds)[number];

export type UniversalTextCardPreset = {
  id: UniversalTextCardPresetId;
  label: string;
  description: string;
  source: { width: number; height: number };
  textArea: NormalizedRect;
  rendering: "surface" | "artwork";
  renderLeadingQuote: boolean;
  exportSlices?: { top: number; right: number; bottom: number; left: number };
  exportDecorCrop?: NormalizedRect;
  exportDecorArea?: NormalizedRect;
};

export const universalTextCardPresets: Readonly<Record<UniversalTextCardPresetId, UniversalTextCardPreset>> = {
  "quality-pill": {
    id: "quality-pill",
    label: "Карточка качества",
    description: "Стандарт 480 × 258 с центральной безопасной областью для короткого качества.",
    source: { width: 480, height: 258 },
    textArea: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 },
    rendering: "surface",
    renderLeadingQuote: false
  },
  "quality-pill-export": {
    id: "quality-pill-export",
    label: "Горизонтальная карточка качества для экспорта",
    description: "Стандарт 720 × 180 для крупной сетки 2–2–1 в Story, Post и A4.",
    source: { width: 720, height: 180 },
    textArea: { x: 0.07, y: 0.12, width: 0.86, height: 0.76 },
    rendering: "surface",
    renderLeadingQuote: false
  },
  "quality-plaque-artwork": {
    id: "quality-plaque-artwork",
    label: "Художественный шильд качества",
    description: "Прозрачный предметный шильд 480 × 258 без дополнительной UI-поверхности.",
    source: { width: 480, height: 258 },
    textArea: { x: 0.08, y: 0.14, width: 0.84, height: 0.72 },
    rendering: "artwork",
    renderLeadingQuote: false
  },
  "quality-plaque-export-artwork": {
    id: "quality-plaque-export-artwork",
    label: "Художественный экспортный шильд",
    description: "Прозрачный предметный шильд 720 × 180 для Story, Post и A4.",
    source: { width: 720, height: 180 },
    textArea: { x: 0.1, y: 0.16, width: 0.8, height: 0.68 },
    rendering: "artwork",
    renderLeadingQuote: false
  },
  "quality-doodle-poster": {
    id: "quality-doodle-poster",
    label: "Высокая карточка качества с рисунком",
    description: "Бумажная карточка 480 × 330: рисунок занимает верхнюю часть, качество центрируется в нижней.",
    source: { width: 480, height: 330 },
    textArea: { x: 0.1, y: 0.57, width: 0.8, height: 0.27 },
    rendering: "artwork",
    renderLeadingQuote: false
  },
  "quality-doodle-export": {
    id: "quality-doodle-export",
    label: "Горизонтальная карточка качества с рисунком",
    description: "Бумажная карточка 720 × 180: рисунок слева, качество центрируется справа.",
    source: { width: 720, height: 180 },
    textArea: { x: 0.24, y: 0.16, width: 0.68, height: 0.68 },
    rendering: "artwork",
    renderLeadingQuote: false
  },
  "quote-panel": {
    id: "quote-panel",
    label: "Карточка цитаты",
    description: "Стандарт 1402 × 1122 с местом для кавычки и многострочной фразы.",
    source: { width: 1402, height: 1122 },
    textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 },
    rendering: "surface",
    renderLeadingQuote: true
  },
  "quote-panel-compact": {
    id: "quote-panel-compact",
    label: "Компактная карточка цитаты",
    description: "Оптимизированный стандарт 800 × 640 с той же безопасной областью для многострочной фразы.",
    source: { width: 800, height: 640 },
    textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 },
    rendering: "surface",
    renderLeadingQuote: true
  },
  "quote-panel-artwork": {
    id: "quote-panel-artwork",
    label: "Художественная цитатная карточка",
    description: "Прозрачная предметная карточка 800 × 640 с единой вкладкой, встроенными кавычками и отдельной safe-area.",
    source: { width: 800, height: 640 },
    textArea: { x: 0.23, y: 0.27, width: 0.69, height: 0.64 },
    rendering: "artwork",
    renderLeadingQuote: false,
    exportSlices: { top: 0.38, right: 0.2, bottom: 0.14, left: 0.28 },
    exportDecorCrop: { x: 0.04, y: 0.42, width: 0.2, height: 0.28 },
    exportDecorArea: { x: 0.055, y: 0.24, width: 0.16, height: 0.52 }
  }
};

export const getUniversalTextCardPreset = (id: UniversalTextCardPresetId) =>
  universalTextCardPresets[id];
