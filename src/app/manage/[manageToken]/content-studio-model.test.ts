import { describe, expect, it } from "vitest";
import type { Contribution } from "@/lib/cards/types";
import {
  canReorderContributions,
  filterContributions,
  normalizeContributionSearch
} from "./content-studio-model";

const contribution = (
  overrides: Partial<Contribution> & Pick<Contribution, "id" | "authorName" | "message">
): Contribution => ({
  cardId: "card",
  authorRole: null,
  authorAvatarUrl: null,
  status: "visible",
  createdAt: "2026-07-31T00:00:00.000Z",
  ...overrides
});

const contributions = [
  contribution({
    id: "one",
    authorName: "Олег",
    authorRole: "коллега",
    message: "Поздравляю с днём рождения"
  }),
  contribution({
    id: "two",
    authorName: "Татьяна",
    message: "Тёплые пожелания",
    status: "hidden"
  })
];

describe("content studio list model", () => {
  it("searches locally across author, role, and message", () => {
    const find = (searchQuery: string) =>
      filterContributions({
        contributions,
        filter: "all",
        searchQuery,
        getRecommendedOverflow: () => 0
      }).map((item) => item.id);

    expect(find(" ОЛЕГ ")).toEqual(["one"]);
    expect(find("коллега")).toEqual(["one"]);
    expect(find("тёплые")).toEqual(["two"]);
  });

  it("combines search with moderation filters", () => {
    expect(
      filterContributions({
        contributions,
        filter: "hidden",
        searchQuery: "Татьяна",
        getRecommendedOverflow: () => 0
      }).map((item) => item.id)
    ).toEqual(["two"]);

    expect(
      filterContributions({
        contributions,
        filter: "too-long",
        searchQuery: "",
        getRecommendedOverflow: (item) => (item.id === "one" ? 1 : 0)
      }).map((item) => item.id)
    ).toEqual(["one"]);
  });

  it("allows reordering only for the complete unsearched list", () => {
    expect(normalizeContributionSearch("  Поздравление  ")).toBe("поздравление");
    expect(canReorderContributions({ filter: "all", searchQuery: "" })).toBe(true);
    expect(canReorderContributions({ filter: "active", searchQuery: "" })).toBe(false);
    expect(canReorderContributions({ filter: "all", searchQuery: "Олег" })).toBe(false);
  });
});
