import { describe, expect, it } from "vitest";
import { cleanImportedDescription, cleanImportedTitle, decodeHtmlEntities, sanitizeGiftPollText } from "./text-sanitization";

describe("gift poll text sanitization", () => {
  it("decodes numeric and named HTML entities", () => {
    expect(decodeHtmlEntities("40&nbsp;050 &#8381; &amp; доставка")).toBe("40 050 ₽ & доставка");
  });

  it("removes markup and normalizes whitespace", () => {
    expect(sanitizeGiftPollText("<b>Лодка</b>\n\tдля отдыха", 60)).toBe("Лодка для отдыха");
  });

  it("cuts at a word boundary instead of mid-word", () => {
    const result = sanitizeGiftPollText("Лодка ПВХ Аква 2900 слань-киль книжка зеленый надувной", 30);
    expect(result).toBe("Лодка ПВХ Аква 2900 слань-киль");
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it("cuts marketplace SEO tails from descriptions", () => {
    expect(cleanImportedDescription("Слань-Киль Зеленый купить в Челябинске по цене 40&nbsp;050 &#8381; | Центр Лодок", "Лодка ПВХ Аква 2900"))
      .toBe("Слань-Киль Зеленый");
  });

  it("removes repeated sentences from descriptions", () => {
    expect(cleanImportedDescription("Лёгкая лодка. Лёгкая лодка. Вместимость два человека.", null))
      .toBe("Лёгкая лодка. Вместимость два человека");
  });

  it("returns an empty description for technical noise", () => {
    expect(cleanImportedDescription("2900 1400 15 3 2", null)).toBe("");
  });
});

describe("cleanImportedTitle", () => {
  it("decodes entities and strips markup", () => {
    expect(cleanImportedTitle("<b>Лодка&nbsp;Аква</b> &amp; мотор")).toBe("Лодка Аква & мотор");
  });

  it("removes a store-name tail after a delimiter", () => {
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900 | Центр Лодок", { storeName: "Центр Лодок" })).toBe("Лодка ПВХ Аква 2900");
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900 — купить в Ozon", { storeName: "Ozon" })).toBe("Лодка ПВХ Аква 2900");
  });

  it("removes the shop domain from the tail", () => {
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900 » centrlodok.ru", { hostname: "centrlodok.ru" })).toBe("Лодка ПВХ Аква 2900");
  });

  it("cuts «купить в <город>» SEO tails", () => {
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900 купить в Москве")).toBe("Лодка ПВХ Аква 2900");
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900 купить с доставкой по России")).toBe("Лодка ПВХ Аква 2900");
  });

  it("cuts a price tail", () => {
    expect(cleanImportedTitle("Лодка ПВХ Аква 2900, 40 050 ₽")).toBe("Лодка ПВХ Аква 2900");
  });

  it("strips a leading «купить»", () => {
    expect(cleanImportedTitle("Купить лодку ПВХ Аква 2900")).toBe("лодку ПВХ Аква 2900");
  });

  it("removes duplicated halves and repeated words", () => {
    expect(cleanImportedTitle("Лодка Аква 2900 Лодка Аква 2900")).toBe("Лодка Аква 2900");
    expect(cleanImportedTitle("Лодка Лодка Аква 2900")).toBe("Лодка Аква 2900");
  });

  it("strips service delimiters at the edges", () => {
    expect(cleanImportedTitle("— Лодка Аква 2900 |")).toBe("Лодка Аква 2900");
  });

  it("keeps a shop word that is part of the real name", () => {
    expect(cleanImportedTitle("Подарочная карта Ozon на 3000 рублей", { storeName: "Ozon" })).toBe("Подарочная карта Ozon на 3000 рублей");
  });

  it("truncates long titles at a word boundary", () => {
    const result = cleanImportedTitle("Лодка ПВХ Аква 2900 слань-киль книжка зеленый с надувным килем и мотором", {}, 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result).toBe("Лодка ПВХ Аква 2900 слань-киль книжка");
  });
});
