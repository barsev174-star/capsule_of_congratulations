import type { CardMediaAsset } from "@/lib/cards/types";
import type { FinalCardMediaSlot, FinalCardMessageMediaLayout } from "./types";

const memorySlots: FinalCardMediaSlot[] = ["memory-a", "memory-b", "memory-c"];

export const getMessageMediaSlots = (layout: FinalCardMessageMediaLayout): FinalCardMediaSlot[] => {
  if (layout === "portrait") return ["portrait"];
  if (layout === "landscape-pair") return ["landscape-a", "landscape-b"];
  return ["landscape-a", "landscape-b", "landscape-c"];
};

export const getMemoryMediaSlots = () => memorySlots;

/**
 * Current cards persist photo ids. Cards delivered before that migration only
 * retain their occupied slot, so use slots exclusively as a read-only legacy
 * fallback for those cards.
 */
export const resolveAssignedMediaAssets = <T extends Pick<CardMediaAsset, "id" | "slot">>(
  mediaAssets: T[],
  mediaAssetIds: string[] | undefined,
  legacySlots: FinalCardMediaSlot[]
) => {
  const selected: T[] = [];
  const selectedIds = new Set<string>();
  const addAsset = (asset: T | undefined) => {
    if (!asset || selectedIds.has(asset.id)) return;
    selected.push(asset);
    selectedIds.add(asset.id);
  };

  if ((mediaAssetIds?.length ?? 0) > 0) {
    (mediaAssetIds ?? []).forEach((id) => addAsset(mediaAssets.find((asset) => asset.id === id)));
    return selected;
  }

  legacySlots.forEach((slot) => addAsset(mediaAssets.find((asset) => asset.slot === slot)));
  return selected;
};
