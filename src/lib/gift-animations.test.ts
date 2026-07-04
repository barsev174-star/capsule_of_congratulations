import { describe, expect, it } from "vitest";
import { defaultGiftAnimationId, giftAnimations, isGiftAnimationId } from "./gift-animations";

describe("gift animations", () => {
  it("exposes the envelope animation as the default", () => {
    expect(defaultGiftAnimationId).toBe("envelope");
    expect(giftAnimations.map((animation) => animation.id)).toContain(defaultGiftAnimationId);
  });

  it("validates animation identifiers", () => {
    expect(isGiftAnimationId("envelope")).toBe(true);
    expect(isGiftAnimationId("unknown")).toBe(false);
  });
});
