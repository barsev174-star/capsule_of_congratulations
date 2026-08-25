import type { NormalizedRect } from "@/lib/templates/profile";

export const universalPhotoFramePresetIds = [
  "portrait-polaroid",
  "landscape-polaroid",
  "portrait-caption-paper",
  "landscape-caption-paper",
  "portrait-shadow-frame",
  "landscape-shadow-frame",
  "landscape-shadow-frame-feature"
] as const;

export type UniversalPhotoFramePresetId = (typeof universalPhotoFramePresetIds)[number];

export type UniversalPhotoFramePreset = {
  id: UniversalPhotoFramePresetId;
  label: string;
  description: string;
  source: { width: number; height: number };
  aspectRatio: number;
  aperture: NormalizedRect;
  captionArea: NormalizedRect;
};

export const universalPhotoFramePresets: Readonly<Record<UniversalPhotoFramePresetId, UniversalPhotoFramePreset>> = {
  "portrait-polaroid": {
    id: "portrait-polaroid",
    label: "Вертикальная фоторамка",
    description: "Стандарт 802 × 1122: портретное окно и подпись в нижней полосе.",
    source: { width: 802, height: 1122 },
    aspectRatio: 802 / 1122,
    aperture: { x: 0.08, y: 0.05, width: 0.84, height: 0.76 },
    captionArea: { x: 0.08, y: 0.83, width: 0.84, height: 0.11 }
  },
  "landscape-polaroid": {
    id: "landscape-polaroid",
    label: "Горизонтальная фоторамка",
    description: "Стандарт 1122 × 802: широкое окно и двухстрочная подпись в нижней полосе.",
    source: { width: 1122, height: 802 },
    aspectRatio: 1122 / 802,
    aperture: { x: 0.08, y: 0.07, width: 0.84, height: 0.7 },
    captionArea: { x: 0.08, y: 0.8, width: 0.84, height: 0.14 }
  },
  "portrait-caption-paper": {
    id: "portrait-caption-paper",
    label: "Вертикальное фото с бумажной подписью",
    description: "Фото без внешней рамки; подпись размещается на отдельном цветном клочке бумаги.",
    source: { width: 802, height: 1122 },
    aspectRatio: 802 / 1122,
    aperture: { x: 0.025, y: 0.025, width: 0.95, height: 0.79 },
    captionArea: { x: 0.075, y: 0.755, width: 0.85, height: 0.22 }
  },
  "landscape-caption-paper": {
    id: "landscape-caption-paper",
    label: "Горизонтальное фото с бумажной подписью",
    description: "Широкое фото без внешней рамки; подпись размещается на отдельном цветном клочке бумаги.",
    source: { width: 1122, height: 802 },
    aspectRatio: 1122 / 802,
    aperture: { x: 0.025, y: 0.03, width: 0.95, height: 0.74 },
    captionArea: { x: 0.075, y: 0.72, width: 0.85, height: 0.25 }
  },
  "portrait-shadow-frame": {
    id: "portrait-shadow-frame",
    label: "Вертикальная белая рамка с тенью",
    description: "Тонкая белая рамка с мягкой тенью и компактной подписью под фотографией.",
    source: { width: 802, height: 1122 },
    aspectRatio: 802 / 1122,
    aperture: { x: 0.04, y: 0.03, width: 0.92, height: 0.82 },
    captionArea: { x: 0.05, y: 0.855, width: 0.9, height: 0.125 }
  },
  "landscape-shadow-frame": {
    id: "landscape-shadow-frame",
    label: "Горизонтальная белая рамка с тенью",
    description: "Широкое фото в чистой белой рамке с мягкой тенью и подписью снизу.",
    source: { width: 1122, height: 802 },
    aspectRatio: 1122 / 802,
    aperture: { x: 0.035, y: 0.05, width: 0.93, height: 0.75 },
    captionArea: { x: 0.045, y: 0.805, width: 0.91, height: 0.17 }
  },
  "landscape-shadow-frame-feature": {
    id: "landscape-shadow-frame-feature",
    label: "Увеличенная белая рамка для моментов",
    description: "Белая рамка с увеличенным окном фотографии и компактной подписью снизу.",
    source: { width: 1122, height: 802 },
    aspectRatio: 1122 / 802,
    aperture: { x: 0.025, y: 0.035, width: 0.95, height: 0.8 },
    captionArea: { x: 0.035, y: 0.835, width: 0.93, height: 0.145 }
  }
};

export const getUniversalPhotoFramePreset = (id: UniversalPhotoFramePresetId) =>
  universalPhotoFramePresets[id];

export const getUniversalPhotoApertureAspectRatio = (id: UniversalPhotoFramePresetId) => {
  const preset = getUniversalPhotoFramePreset(id);
  return (preset.source.width * preset.aperture.width) / (preset.source.height * preset.aperture.height);
};
