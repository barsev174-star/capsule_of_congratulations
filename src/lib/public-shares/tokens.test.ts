import { describe, expect, it } from "vitest";
import { createPublicShareToken, hashPublicShareToken } from "./tokens";

describe("public share tokens", () => {
  it("derives a stable opaque token and stores a different hash", () => {
    const token = createPublicShareToken("00000000-0000-4000-8000-000000000001");
    expect(createPublicShareToken("00000000-0000-4000-8000-000000000001")).toBe(token);
    expect(token).not.toContain("00000000");
    expect(hashPublicShareToken(token)).not.toBe(token);
  });

  it("does not reuse a token for another public version", () => {
    expect(createPublicShareToken("00000000-0000-4000-8000-000000000001")).not.toBe(createPublicShareToken("00000000-0000-4000-8000-000000000002"));
  });
});
