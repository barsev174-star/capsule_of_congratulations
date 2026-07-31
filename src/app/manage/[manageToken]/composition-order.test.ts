import { describe, expect, it } from "vitest";
import type { FinalCardBlockId } from "@/lib/final-card/types";
import { reorderCompositionBlocks } from "./composition-order";

const order: FinalCardBlockId[] = ["hero", "summary", "qualities", "messages", "closing"];

describe("reorderCompositionBlocks", () => {
  it("moves a block below a target once the pointer crosses its midpoint", () => {
    expect(reorderCompositionBlocks(order, "summary", "qualities", "after")).toEqual([
      "hero",
      "qualities",
      "summary",
      "messages",
      "closing"
    ]);
  });

  it("moves a block above a target once the pointer crosses its midpoint", () => {
    expect(reorderCompositionBlocks(order, "messages", "summary", "before")).toEqual([
      "hero",
      "messages",
      "summary",
      "qualities",
      "closing"
    ]);
  });

  it("keeps the same reference when the requested position is already current", () => {
    expect(reorderCompositionBlocks(order, "summary", "qualities", "before")).toBe(order);
  });

  it("does not insert a block that is absent from the current order", () => {
    const withoutQuotes = order.filter((blockId) => blockId !== "quotes");
    expect(reorderCompositionBlocks(withoutQuotes, "quotes", "summary", "before")).toBe(withoutQuotes);
  });
});
