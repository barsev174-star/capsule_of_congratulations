import type { NormalizedRect } from "@/lib/templates/profile";

export const universalPhotoFramePresetIds = [
  "portrait-polaroid",
  "landscape-polaroid"
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
  }
};

export const getUniversalPhotoFramePreset = (id: UniversalPhotoFramePresetId) =>
  universalPhotoFramePresets[id];

export const getUniversalPhotoApertureAspectRatio = (id: UniversalPhotoFramePresetId) => {
  const preset = getUniversalPhotoFramePreset(id);
  return (preset.source.width * preset.aperture.width) / (preset.source.height * preset.aperture.height);
};
