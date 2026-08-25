import type { NormalizedRect, TemplateAssetRef } from "@/lib/templates/profile";

export const universalSectionUnderlayPresetIds = [
  "adaptive-frame",
  "cover",
  "bottom-edge"
] as const;

export type UniversalSectionUnderlayPresetId = (typeof universalSectionUnderlayPresetIds)[number];

export type NormalizedEdgeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type TemplateSectionUnderlay = {
  asset: TemplateAssetRef;
  mobileAsset?: TemplateAssetRef;
  preset: UniversalSectionUnderlayPresetId;
  /** Optional artwork-specific edges that keep decoration out of stretchable zones. */
  slices?: NormalizedEdgeInsets;
  opacity?: number;
  focalPoint?: { x: number; y: number };
  safeArea?: NormalizedRect;
  exportRendering?: "horizontal-slice" | "cover";
  exportHorizontalSliceEdgeRatio?: number;
};

export type UniversalSectionUnderlayPreset = {
  id: UniversalSectionUnderlayPresetId;
  label: string;
  description: string;
  rendering: "nine-slice" | "cover" | "bottom-edge";
  /** Quiet artwork region. The renderer converts it to minimum content insets. */
  safeArea: NormalizedRect;
  /** Immutable source edges for nine-slice rendering. */
  slices?: NormalizedEdgeInsets;
  edgeSize?: number;
};

export const universalSectionUnderlayPresets: Readonly<Record<UniversalSectionUnderlayPresetId, UniversalSectionUnderlayPreset>> = {
  "adaptive-frame": {
    id: "adaptive-frame",
    label: "Адаптивная рамка",
    description: "Сохраняет углы и края, растягивает только центральные зоны. Для бумаги, рамок и художественных карточек.",
    rendering: "nine-slice",
    safeArea: { x: 0.075, y: 0.115, width: 0.85, height: 0.77 },
    slices: { top: 0.08, right: 0.05, bottom: 0.08, left: 0.05 }
  },
  cover: {
    id: "cover",
    label: "Фоновая текстура",
    description: "Заполняет блок с обрезкой по краям. Для спокойных текстур без значимых деталей у границ.",
    rendering: "cover",
    safeArea: { x: 0.03, y: 0.05, width: 0.94, height: 0.9 }
  },
  "bottom-edge": {
    id: "bottom-edge",
    label: "Нижний орнамент",
    description: "Закрепляет изображение у нижнего края блока и не растягивает его на всю высоту.",
    rendering: "bottom-edge",
    safeArea: { x: 0.025, y: 0.04, width: 0.95, height: 0.9 },
    edgeSize: 0.1
  }
};

export const getUniversalSectionUnderlayPreset = (id: UniversalSectionUnderlayPresetId) =>
  universalSectionUnderlayPresets[id];

export const defineSectionUnderlay = (
  asset: TemplateAssetRef,
  preset: UniversalSectionUnderlayPresetId = "adaptive-frame",
  options: Pick<TemplateSectionUnderlay, "opacity" | "focalPoint" | "mobileAsset" | "safeArea" | "slices" | "exportRendering" | "exportHorizontalSliceEdgeRatio"> = {}
): TemplateSectionUnderlay => ({ asset, preset, ...options });

export const getUnderlaySafeInsets = (underlay: TemplateSectionUnderlay) => {
  const safeArea = underlay.safeArea ?? getUniversalSectionUnderlayPreset(underlay.preset).safeArea;
  const aspectHeight = underlay.asset.height / underlay.asset.width;
  return {
    top: safeArea.y * aspectHeight,
    right: 1 - safeArea.x - safeArea.width,
    bottom: (1 - safeArea.y - safeArea.height) * aspectHeight,
    left: safeArea.x
  };
};
