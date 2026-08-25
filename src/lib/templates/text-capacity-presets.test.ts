import {
  getUniversalPhotoCaptionScale,
  getUniversalRecipientNameLines,
  getUniversalRecipientNameTier,
  getUniversalQuoteLengthScale,
  universalTextCapacityPresets
} from "@/lib/templates/text-capacity-presets";

describe("universal text capacity presets", () => {
  it("keeps hard limits for reusable template text regions", () => {
    expect(universalTextCapacityPresets.recipientName).toMatchObject({ maxChars: 80, maxLines: 2 });
    expect(universalTextCapacityPresets.photoCaption).toMatchObject({ maxChars: 45, maxLines: 2 });
    expect(universalTextCapacityPresets.quoteCard).toMatchObject({ maxChars: 100, maxLines: 4 });
    expect(universalTextCapacityPresets.messageCard.overflow).toBe("ellipsis");
  });

  it("selects a bounded recipient-name font tier", () => {
    expect(getUniversalRecipientNameTier("Anna")).toBe("default");
    expect(getUniversalRecipientNameTier("x".repeat(19))).toBe("long");
    expect(getUniversalRecipientNameTier("x".repeat(40))).toBe("long");
    expect(getUniversalRecipientNameTier("x".repeat(41))).toBe("very-long");
    expect(getUniversalRecipientNameTier("Анна Сергеевна")).toBe("long");
  });

  it("puts a Russian first name and patronymic on separate lines", () => {
    expect(getUniversalRecipientNameLines("Наталья Афанасьевна")).toEqual(["Наталья", "Афанасьевна"]);
    expect(getUniversalRecipientNameLines("Алексей Петрович")).toEqual(["Алексей", "Петрович"]);
    expect(getUniversalRecipientNameLines("Анна Иванова")).toEqual(["Анна Иванова"]);
  });

  it("scales only near-limit quotes inside the fixed four-line area", () => {
    expect(getUniversalQuoteLengthScale("x".repeat(65))).toBe(1);
    expect(getUniversalQuoteLengthScale("x".repeat(66))).toBe(.88);
    expect(getUniversalQuoteLengthScale("x".repeat(81))).toBe(.78);
    expect(getUniversalQuoteLengthScale("x".repeat(100))).toBe(.72);
    expect(universalTextCapacityPresets.quoteCard.overflow).toBe("clip");
  });

  it("keeps short captions full-size and approaches minScale only near the hard limit", () => {
    expect(getUniversalPhotoCaptionScale("Короткая подпись", .7)).toBe(1);
    expect(getUniversalPhotoCaptionScale("Самая тёплая прогулка этого года", .7)).toBeCloseTo(.929, 3);
    expect(getUniversalPhotoCaptionScale("x".repeat(39), .7)).toBeCloseTo(.806, 3);
    expect(getUniversalPhotoCaptionScale("x".repeat(45), .7)).toBe(.7);
  });
});
