import { describe, expect, it } from "vitest";
import { getUniversalTextCardPreset, universalTextCardPresetIds } from "@/lib/templates/text-card-presets";

describe("universal text card presets", () => {
  it("fixes source size and safe text geometry", () => {
    expect(universalTextCardPresetIds).toEqual([
      "quality-pill",
      "quality-pill-export",
      "quality-plaque-artwork",
      "quality-plaque-export-artwork",
      "quality-doodle-poster",
      "quality-doodle-export",
      "quote-panel",
      "quote-panel-compact",
      "quote-panel-artwork"
    ]);
    expect(getUniversalTextCardPreset("quality-pill")).toMatchObject({
      source: { width: 480, height: 258 },
      textArea: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 }
    });
    expect(getUniversalTextCardPreset("quality-pill-export")).toMatchObject({
      source: { width: 720, height: 180 },
      textArea: { x: 0.07, y: 0.12, width: 0.86, height: 0.76 }
    });
    expect(getUniversalTextCardPreset("quality-doodle-poster")).toMatchObject({
      source: { width: 480, height: 330 },
      textArea: { x: 0.1, y: 0.57, width: 0.8, height: 0.27 },
      rendering: "artwork"
    });
    expect(getUniversalTextCardPreset("quality-doodle-export")).toMatchObject({
      source: { width: 720, height: 180 },
      textArea: { x: 0.24, y: 0.16, width: 0.68, height: 0.68 },
      rendering: "artwork"
    });
    expect(getUniversalTextCardPreset("quote-panel")).toMatchObject({
      source: { width: 1402, height: 1122 },
      textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 }
    });
    expect(getUniversalTextCardPreset("quote-panel-compact")).toMatchObject({
      source: { width: 800, height: 640 },
      textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 }
    });
    expect(getUniversalTextCardPreset("quote-panel-artwork")).toMatchObject({
      source: { width: 800, height: 640 },
      textArea: { x: 0.23, y: 0.27, width: 0.69, height: 0.64 },
      rendering: "artwork",
      renderLeadingQuote: false,
      exportSlices: { top: 0.38, right: 0.2, bottom: 0.14, left: 0.28 },
      exportDecorCrop: { x: 0.04, y: 0.42, width: 0.2, height: 0.28 },
      exportDecorArea: { x: 0.055, y: 0.24, width: 0.16, height: 0.52 }
    });
  });
});
