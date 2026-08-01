import { describe, expect, it } from "vitest";
import type { Contribution } from "@/lib/cards/types";
import { moveContributionIdAfter, moveContributionIdRelative, moveContributionIdToIndex, selectCongratulations } from "./congratulations-model";

const contribution = (id: string, overrides: Partial<Contribution> = {}): Contribution => ({
  id,
  cardId: "card",
  authorName: id,
  authorRole: "коллега",
  authorAvatarUrl: null,
  message: "Тёплое поздравление из нескольких добрых слов",
  sortOrder: 0,
  status: "visible",
  source: "manual",
  createdAt: `2026-01-0${id.length}T00:00:00.000Z`,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

describe("congratulations model", () => {
  it("searches by author, role and text and keeps the card order by default", () => {
    const items = [contribution("Олег"), contribution("Мария", { authorRole: "дизайнер" })];
    expect(selectCongratulations({ contributions: items, searchQuery: "дизайн", filter: "all", sort: "card" }).map((item) => item.id)).toEqual(["Мария"]);
  });

  it("shows only meaningful warning filters", () => {
    const items = [
      contribution("main"),
      contribution("hidden", { status: "hidden" }),
      contribution("long", { message: "я".repeat(281) })
    ];
    expect(selectCongratulations({ contributions: items, searchQuery: "", filter: "hidden", sort: "card" }).map((item) => item.id)).toEqual(["hidden"]);
    expect(selectCongratulations({ contributions: items, searchQuery: "", filter: "too-long", sort: "card" }).map((item) => item.id)).toEqual(["long"]);
  });

  it("moves directly to the beginning, end, a position and after another greeting", () => {
    expect(moveContributionIdToIndex(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
    expect(moveContributionIdToIndex(["a", "b", "c"], "a", 99)).toEqual(["b", "c", "a"]);
    expect(moveContributionIdToIndex(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
    expect(moveContributionIdAfter(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("moves only after crossing the target midpoint", () => {
    expect(moveContributionIdRelative(["a", "b", "c"], "a", "c", "before")).toEqual(["b", "a", "c"]);
    expect(moveContributionIdRelative(["a", "b", "c"], "a", "c", "after")).toEqual(["b", "c", "a"]);
    expect(moveContributionIdRelative(["a", "b", "c"], "b", "c", "before")).toEqual(["a", "b", "c"]);
  });

  it("keeps all 100 greetings stable in the card order", () => {
    const items = Array.from({ length: 100 }, (_, index) => contribution(`person-${index}`, { sortOrder: index }));
    const result = selectCongratulations({ contributions: items, searchQuery: "", filter: "all", sort: "card" });
    expect(result).toHaveLength(100);
    expect(result[0]?.id).toBe("person-0");
    expect(result[99]?.id).toBe("person-99");
  });
});
