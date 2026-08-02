import { describe, expect, it } from "vitest";
import type { CardMediaAsset } from "./types";
import {
  canStartPhotoPointerDrag,
  getActiveMessageSlots,
  getActivePhotoSlots,
  getPhotoRequirements,
  getSlotBlock,
  getSlotOrientation,
  getSlotPosition,
  moveAssetsBetweenSlots,
  moveCropByPointer,
  normalizeCrop
} from "./media-slots";

describe("media slots", () => {
  it("supports all three greeting photo layouts", () => {
    expect(getActiveMessageSlots("portrait")).toEqual(["portrait"]);
    expect(getActiveMessageSlots("landscape-pair")).toEqual(["landscape-a", "landscape-b"]);
    expect(getActiveMessageSlots("landscape-trio")).toEqual(["landscape-a", "landscape-b", "landscape-c"]);
  });

  it("shares the first two horizontal positions between pair and trio layouts", () => {
    const pair = getActiveMessageSlots("landscape-pair");
    const trio = getActiveMessageSlots("landscape-trio");
    expect(trio.slice(0, 2)).toEqual(pair);
    expect(trio[2]).toBe("landscape-c");
  });

  it("derives slots and readiness only from the active composition", () => {
    expect(getActivePhotoSlots({
      mediaLayout: "landscape-trio",
      messagePhotosEnabled: false,
      momentsEnabled: false
    })).toEqual({ messageSlots: [], memorySlots: [] });
    expect(getPhotoRequirements({
      mediaLayout: "landscape-pair",
      messagePhotosEnabled: true,
      momentsEnabled: false
    })).toEqual({ congratulationsRequired: 2, momentsRequired: 0, totalRequired: 2 });
    expect(getPhotoRequirements({
      mediaLayout: "portrait",
      messagePhotosEnabled: false,
      momentsEnabled: true
    })).toEqual({ congratulationsRequired: 0, momentsRequired: 3, totalRequired: 3 });
  });

  it("describes slot block, position and required frame orientation", () => {
    expect(getSlotBlock("landscape-b")).toBe("greetings");
    expect(getSlotBlock("memory-c")).toBe("moments");
    expect(getSlotPosition("memory-c")).toBe(3);
    expect(getSlotOrientation("portrait")).toBe("vertical");
    expect(getSlotOrientation("memory-a")).toBe("horizontal");
  });

  it("keeps crop values inside supported bounds", () => {
    expect(normalizeCrop({ x: -20, y: 140, zoom: 8 })).toEqual({ x: 0, y: 100, zoom: 3 });
    expect(normalizeCrop({ x: Number.NaN, y: Number.NaN, zoom: Number.NaN })).toEqual({ x: 50, y: 50, zoom: 1 });
  });

  it("moves the crop only by the supplied pointer delta", () => {
    expect(moveCropByPointer({ x: 50, y: 50, zoom: 2 }, 100, -50, 500, 250))
      .toEqual({ x: 40, y: 60, zoom: 2 });
  });

  it("starts card dragging only for a primary desktop pointer", () => {
    expect(canStartPhotoPointerDrag("mouse", 0, false)).toBe(true);
    expect(canStartPhotoPointerDrag("pen", 0, false)).toBe(true);
    expect(canStartPhotoPointerDrag("touch", 0, false)).toBe(false);
    expect(canStartPhotoPointerDrag("mouse", 1, false)).toBe(false);
    expect(canStartPhotoPointerDrag("mouse", 0, true)).toBe(false);
  });

  it("moves into a free slot and swaps an occupied slot", () => {
    const assets = [
      { id: "left", slot: "landscape-a" as const },
      { id: "right", slot: "landscape-b" as const }
    ] as CardMediaAsset[];

    expect(moveAssetsBetweenSlots(assets, "left", "landscape-c").map(({ id, slot }) => ({ id, slot })))
      .toEqual([
        { id: "left", slot: "landscape-c" },
        { id: "right", slot: "landscape-b" }
      ]);
    expect(moveAssetsBetweenSlots(assets, "left", "landscape-b").map(({ id, slot }) => ({ id, slot })))
      .toEqual([
        { id: "left", slot: "landscape-b" },
        { id: "right", slot: "landscape-a" }
      ]);
  });
});
