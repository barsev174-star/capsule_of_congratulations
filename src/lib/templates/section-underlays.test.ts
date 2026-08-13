import { describe, expect, it } from "vitest";
import {
  defineSectionUnderlay,
  getUnderlaySafeInsets,
  getUniversalSectionUnderlayPreset,
  universalSectionUnderlayPresetIds
} from "@/lib/templates/section-underlays";

const asset = { src: "/templates/test/section.webp" as const, width: 1376, height: 768 };

describe("universal section underlays", () => {
  it("offers only standardized rendering presets", () => {
    expect(universalSectionUnderlayPresetIds).toEqual(["adaptive-frame", "cover", "bottom-edge"]);
    expect(getUniversalSectionUnderlayPreset("adaptive-frame")).toMatchObject({
      rendering: "nine-slice",
      slices: { top: 0.08, right: 0.05, bottom: 0.08, left: 0.05 }
    });
  });

  it("derives safe content insets from the source contract instead of block pixels", () => {
    const underlay = defineSectionUnderlay(asset, "adaptive-frame");

    expect(getUnderlaySafeInsets(underlay)).toEqual({
      top: expect.closeTo(0.064, 3),
      right: expect.closeTo(0.075, 4),
      bottom: expect.closeTo(0.064, 3),
      left: 0.075
    });
  });

  it("keeps optional opacity and focal point declarative", () => {
    expect(defineSectionUnderlay(asset, "cover", { opacity: 0.4, focalPoint: { x: 0.2, y: 0.8 } })).toEqual({
      asset,
      preset: "cover",
      opacity: 0.4,
      focalPoint: { x: 0.2, y: 0.8 }
    });
  });
});
