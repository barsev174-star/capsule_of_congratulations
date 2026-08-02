import type { CardMediaAsset, CardMediaSlot } from "@/lib/cards/types";
import type { FinalCardMessageMediaLayout } from "@/lib/final-card/types";

export type PhotoOrientation = "horizontal" | "vertical";

export const MESSAGE_MEDIA_SLOTS: Record<FinalCardMessageMediaLayout, CardMediaSlot[]> = {
  portrait: ["portrait"],
  "landscape-pair": ["landscape-a", "landscape-b"],
  "landscape-trio": ["landscape-a", "landscape-b", "landscape-c"]
};

export const MEMORY_MEDIA_SLOTS: CardMediaSlot[] = ["memory-a", "memory-b", "memory-c"];

export const ALL_MEDIA_SLOTS: CardMediaSlot[] = [
  "portrait",
  "landscape-a",
  "landscape-b",
  "landscape-c",
  ...MEMORY_MEDIA_SLOTS
];

export const getSlotOrientation = (slot: CardMediaSlot): PhotoOrientation =>
  slot === "portrait" ? "vertical" : "horizontal";

export const getSlotPosition = (slot: CardMediaSlot) => {
  if (slot === "portrait" || slot.endsWith("-a")) return 1;
  if (slot.endsWith("-b")) return 2;
  return 3;
};

export const getSlotBlock = (slot: CardMediaSlot): "greetings" | "moments" =>
  slot.startsWith("memory") ? "moments" : "greetings";

export const getSlotLabel = (slot: CardMediaSlot) => {
  const block = getSlotBlock(slot) === "greetings" ? "Поздравления" : "Моменты";
  return `${block} · позиция ${getSlotPosition(slot)}`;
};

export const getActiveMessageSlots = (layout: FinalCardMessageMediaLayout) => MESSAGE_MEDIA_SLOTS[layout];

export const getActivePhotoSlots = ({
  mediaLayout,
  messagePhotosEnabled,
  momentsEnabled
}: {
  mediaLayout: FinalCardMessageMediaLayout;
  messagePhotosEnabled: boolean;
  momentsEnabled: boolean;
}) => ({
  messageSlots: messagePhotosEnabled ? getActiveMessageSlots(mediaLayout) : [],
  memorySlots: momentsEnabled ? MEMORY_MEDIA_SLOTS : []
});

export const getPhotoRequirements = (composition: Parameters<typeof getActivePhotoSlots>[0]) => {
  const { messageSlots, memorySlots } = getActivePhotoSlots(composition);
  return {
    congratulationsRequired: messageSlots.length,
    momentsRequired: memorySlots.length,
    totalRequired: messageSlots.length + memorySlots.length
  };
};

export const canStartPhotoPointerDrag = (pointerType: string, button: number, pending: boolean) =>
  pointerType !== "touch" && button === 0 && !pending;

export const getAssetsForSlots = <T extends Pick<CardMediaAsset, "slot">>(assets: T[], slots: CardMediaSlot[]) =>
  slots.map((slot) => assets.find((asset) => asset.slot === slot)).filter((asset): asset is T => Boolean(asset));

export const clampCropValue = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export const normalizeCrop = (crop: { x: number; y: number; zoom: number }) => ({
  x: clampCropValue(crop.x, 0, 100, 50),
  y: clampCropValue(crop.y, 0, 100, 50),
  zoom: clampCropValue(crop.zoom, 1, 3, 1)
});

export const moveCropByPointer = (
  crop: { x: number; y: number; zoom: number },
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number
) => normalizeCrop({
  x: crop.x - (deltaX / Math.max(1, viewportWidth)) * 100 / crop.zoom,
  y: crop.y - (deltaY / Math.max(1, viewportHeight)) * 100 / crop.zoom,
  zoom: crop.zoom
});

export const moveAssetsBetweenSlots = (
  assets: CardMediaAsset[],
  assetId: string,
  targetSlot: CardMediaSlot
) => {
  const moving = assets.find((asset) => asset.id === assetId);
  if (!moving || moving.slot === targetSlot) return assets;
  const occupied = assets.find((asset) => asset.slot === targetSlot);
  return assets.map((asset) => {
    if (asset.id === moving.id) return { ...asset, slot: targetSlot };
    if (occupied && asset.id === occupied.id) return { ...asset, slot: moving.slot };
    return asset;
  });
};

export const getCropStyle = (asset: Pick<CardMediaAsset, "cropX" | "cropY" | "cropZoom">) => ({
  objectPosition: `${asset.cropX ?? 50}% ${asset.cropY ?? 50}%`,
  transform: `scale(${asset.cropZoom ?? 1})`,
  transformOrigin: `${asset.cropX ?? 50}% ${asset.cropY ?? 50}%`
});
