import { describe, expect, it } from "vitest";
import { CARD_CONTRIBUTION_LIMIT, ContributionLimitReachedError } from "./limits";

describe("contribution limits", () => {
  it("keeps the product limit at 100 greetings", () => {
    expect(CARD_CONTRIBUTION_LIMIT).toBe(100);
  });

  it("provides a user-facing limit message", () => {
    expect(new ContributionLimitReachedError().message).toContain("100 поздравлений");
  });
});
