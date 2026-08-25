import { describe, expect, it } from "vitest";
import { getUniversalPhotoFramePreset, universalPhotoFramePresetIds } from "@/lib/templates/photo-frame-presets";

describe("universal photo frame presets", () => {
  it("fixes source geometry for portrait and landscape assets", () => {
    expect(universalPhotoFramePresetIds).toEqual([
      "portrait-polaroid",
      "landscape-polaroid",
      "portrait-caption-paper",
      "landscape-caption-paper",
      "portrait-shadow-frame",
      "landscape-shadow-frame",
      "landscape-shadow-frame-feature"
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
    expect(getUniversalPhotoFramePreset("portrait-shadow-frame")).toMatchObject({
      source: { width: 802, height: 1122 },
      aperture: { x: 0.04, y: 0.03, width: 0.92, height: 0.82 },
      captionArea: { x: 0.05, y: 0.855, width: 0.9, height: 0.125 }
    });
    expect(getUniversalPhotoFramePreset("landscape-shadow-frame")).toMatchObject({
      source: { width: 1122, height: 802 },
      aperture: { x: 0.035, y: 0.05, width: 0.93, height: 0.75 },
      captionArea: { x: 0.045, y: 0.805, width: 0.91, height: 0.17 }
    });
    expect(getUniversalPhotoFramePreset("landscape-shadow-frame-feature")).toMatchObject({
      source: { width: 1122, height: 802 },
      aperture: { x: 0.025, y: 0.035, width: 0.95, height: 0.8 },
      captionArea: { x: 0.035, y: 0.835, width: 0.93, height: 0.145 }
    });
  });
});
