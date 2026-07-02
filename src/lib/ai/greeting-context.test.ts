import { describe, expect, it } from "vitest";
import {
  buildSafeWishSummary,
  inferAddressName,
  inferOccasionContext,
  normalizeOccasionForSentence,
  prepareDraftForPrompt
} from "@/lib/ai/greeting-context";

describe("universal greeting context", () => {
  it("uses the first name for a peer with a patronymic", () => {
    expect(inferAddressName("Анна Ивановна", "peer")).toMatchObject({
      recipientOriginalName: "Анна Ивановна",
      addressName: "Анна"
    });
  });

  it("preserves the full name for an official relationship", () => {
    expect(inferAddressName("Анна Ивановна", "official").addressName).toBe("Анна Ивановна");
  });

  it.each([
    ["С днём рождения!", "birthday"],
    ["Поздравляем со свадьбой", "wedding"],
    ["С юбилеем!", "anniversary"],
    ["С выпускным!", "graduation"],
    ["Спасибо за помощь", "gratitude"],
    ["Удачи при переходе в другую команду", "farewell"]
  ] as const)("infers %s as %s", (occasionText, category) => {
    expect(inferOccasionContext({ occasionText, draftNotes: "", relationshipContext: "" }).occasionCategory)
      .toBe(category);
  });

  it("extracts only explicit wish topics", () => {
    expect(inferOccasionContext({
      occasionText: "С выпускным!",
      relationshipContext: "сокурсница",
      draftNotes: "Желаю найти интересную работу с хорошей зарплатой."
    }).explicitWishTopics).toEqual(expect.arrayContaining(["work", "money", "study"]));
  });

  it("compresses career wishes into one soft universal theme", () => {
    expect(buildSafeWishSummary(["work", "money", "future"], "graduation"))
      .toBe("найти место, где интересно и ценят твой труд");
  });

  it("marks a multi-part career wish as overloaded", () => {
    const context = inferOccasionContext({
      occasionText: "С выпускным!",
      relationshipContext: "сокурсница",
      draftNotes: "Желаю работу мечты, высокую зарплату и хорошее будущее."
    });

    expect(context.overloadedWishTopics).toEqual(expect.arrayContaining(["work", "money", "future"]));
    expect(context.safeWishOptions).toHaveLength(5);
    expect(new Set(context.safeWishOptions).size).toBe(5);
  });

  it("uses occasion-specific defaults without assuming a career context", () => {
    expect(buildSafeWishSummary([], "wedding")).toContain("совместной жизни");
    expect(buildSafeWishSummary([], "birthday")).not.toMatch(/работ|доход|карьер/iu);
  });

  it("normalizes an occasion used inside a sentence", () => {
    expect(normalizeOccasionForSentence("С Выпускным!")).toBe("с выпускным");
  });

  it("replaces a career wish list with one safe summary", () => {
    expect(prepareDraftForPrompt(
      "Она всегда помогала. Нужно пожелать работу мечты, высокую зарплату и карьерный рост.",
      "найти место, где интересно и ценят твой труд"
    )).toBe("Она всегда помогала. Пожелание: найти место, где интересно и ценят твой труд.");
  });
});
