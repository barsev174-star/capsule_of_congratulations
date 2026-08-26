import { describe, expect, it } from "vitest";
import { colleagueFaqs, colleagueOccasions } from "./colleague-landing-content";

describe("colleague landing content", () => {
  it("covers the four evergreen colleague occasions", () => {
    expect(colleagueOccasions.map(({ title }) => title)).toEqual([
      "День рождения",
      "Повышение",
      "Уход из компании",
      "Благодарность"
    ]);
  });

  it("uses the search wording about увольнение naturally in FAQ", () => {
    expect(colleagueFaqs.some(([question]) => question.includes("увольнении"))).toBe(true);
  });
});
