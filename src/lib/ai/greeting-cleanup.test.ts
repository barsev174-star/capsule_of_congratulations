import { describe, expect, it } from "vitest";
import { cleanupGreetingText } from "@/lib/ai/greeting-cleanup";

describe("greeting cleanup", () => {
  const context = { fromLabel: "от друзей", occasionText: "С выпускным!" };

  it("removes a leaked fromLabel signature", () => {
    expect(cleanupGreetingText(
      "Анна, с выпускным! Спасибо за помощь. От друзей, однокурсник.",
      context
    )).toBe("Анна, с выпускным! Спасибо за помощь.");
  });

  it("removes a duplicate occasion and normalizes its case", () => {
    expect(cleanupGreetingText(
      "Анна, с Выпускным! Спасибо за помощь. С Выпускным!",
      context
    )).toBe("Анна, с выпускным! Спасибо за помощь.");
  });

  it("keeps an occasion capitalized at the start of a sentence", () => {
    expect(cleanupGreetingText("С Выпускным, Анна!", context)).toBe("С выпускным, Анна!");
  });

  it("repairs a missing conditional particle in a personal consequence", () => {
    expect(cleanupGreetingText(
      "Анна, спасибо за помощь — без тебя мои оценки были хуже.",
      context
    )).toBe("Анна, спасибо за помощь — без тебя мои оценки были бы хуже.");
  });
});
