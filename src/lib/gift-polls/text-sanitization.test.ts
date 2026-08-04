import { describe, expect, it } from "vitest";
import { cleanImportedDescription, decodeHtmlEntities, sanitizeGiftPollText } from "./text-sanitization";

describe("gift poll text sanitization", () => {
  it("decodes numeric and named HTML entities", () => {
    expect(decodeHtmlEntities("40&nbsp;050 &#8381; &amp; доставка")).toBe("40 050 ₽ & доставка");
  });

  it("removes markup and normalizes whitespace", () => {
    expect(sanitizeGiftPollText("<b>Лодка</b>\n\tдля отдыха", 60)).toBe("Лодка для отдыха");
  });

  it("cuts marketplace SEO tails from descriptions", () => {
    expect(cleanImportedDescription("Слань-Киль Зеленый купить в Челябинске по цене 40&nbsp;050 &#8381; | Центр Лодок", "Лодка ПВХ Аква 2900"))
      .toBe("Слань-Киль Зеленый");
  });
});
