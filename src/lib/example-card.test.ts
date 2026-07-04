import { describe, expect, it } from "vitest";
import { exampleCardModel } from "./example-card";

describe("example card", () => {
  it("uses the agreed photo groups", () => {
    expect(exampleCardModel.messageMediaAssets.map((asset) => asset.fileName)).toEqual(["1.jpg", "3.jpg", "5.jpg"]);
    expect(exampleCardModel.memoryMediaAssets.map((asset) => asset.fileName)).toEqual(["2.jpg", "4.jpg", "6.jpg"]);
  });

  it("contains the complete demonstration content", () => {
    expect(exampleCardModel.contributions).toHaveLength(6);
    expect(exampleCardModel.quotes).toHaveLength(3);
    expect(exampleCardModel.qualities).toHaveLength(6);
  });
});
