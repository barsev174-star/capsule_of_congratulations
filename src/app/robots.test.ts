import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("keeps the internal roadmap out of search results", () => {
    expect(robots().rules).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: "/roadmap"
    });
  });
});
