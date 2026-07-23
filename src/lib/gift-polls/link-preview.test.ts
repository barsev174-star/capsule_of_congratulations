import { describe, expect, it } from "vitest";
import { extractProductUrl } from "./link-preview";

describe("extractProductUrl", () => {
  it("finds and cleans a URL in copied text", () => expect(extractProductUrl("Товар: https://www.ozon.ru/product/item-1)." )).toBe("https://www.ozon.ru/product/item-1"));
  it("uses the first supported URL", () => expect(extractProductUrl("https://one.example/a и https://two.example/b")).toBe("https://one.example/a"));
  it("does not treat descriptive text as a URL", () => expect(extractProductUrl("Подарок без магазина")).toBeNull());
});
