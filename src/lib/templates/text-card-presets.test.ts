import { describe, expect, it } from "vitest";
import { getUniversalTextCardPreset, universalTextCardPresetIds } from "@/lib/templates/text-card-presets";

describe("universal text card presets", () => {
  it("fixes source size and safe text geometry", () => {
    expect(universalTextCardPresetIds).toEqual(["quality-pill", "quote-panel"]);
    expect(getUniversalTextCardPreset("quality-pill")).toMatchObject({
      source: { width: 480, height: 258 },
      textArea: { x: 0.05, y: 0.1, width: 0.9, height: 0.8 }
    });
    expect(getUniversalTextCardPreset("quote-panel")).toMatchObject({
      source: { width: 1402, height: 1122 },
      textArea: { x: 0.055, y: 0.28, width: 0.89, height: 0.62 }
    });
  });
});
