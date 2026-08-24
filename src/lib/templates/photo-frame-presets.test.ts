import { describe, expect, it } from "vitest";
import { getUniversalPhotoFramePreset, universalPhotoFramePresetIds } from "@/lib/templates/photo-frame-presets";

describe("universal photo frame presets", () => {
  it("fixes source geometry for portrait and landscape assets", () => {
    expect(universalPhotoFramePresetIds).toEqual([
      "portrait-polaroid",
      "landscape-polaroid",
      "portrait-caption-paper",
      "landscape-caption-paper"
    ]);
    expect(getUniversalPhotoFramePreset("portrait-polaroid")).toMatchObject({
      source: { width: 802, height: 1122 },
      aperture: { x: 0.08, y: 0.05, width: 0.84, height: 0.76 }
    });
    expect(getUniversalPhotoFramePreset("landscape-polaroid")).toMatchObject({
      source: { width: 1122, height: 802 },
      aperture: { x: 0.08, y: 0.07, width: 0.84, height: 0.7 }
    });
    expect(getUniversalPhotoFramePreset("portrait-caption-paper")).toMatchObject({
      aperture: { x: 0.025, y: 0.025, width: 0.95, height: 0.79 },
      captionArea: { x: 0.075, y: 0.755, width: 0.85, height: 0.22 }
    });
    expect(getUniversalPhotoFramePreset("landscape-caption-paper")).toMatchObject({
      aperture: { x: 0.025, y: 0.03, width: 0.95, height: 0.74 },
      captionArea: { x: 0.075, y: 0.72, width: 0.85, height: 0.25 }
    });
  });
});
