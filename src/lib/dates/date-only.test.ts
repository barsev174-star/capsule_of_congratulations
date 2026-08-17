import { describe, expect, it } from "vitest";
import { serializeDateOnly } from "./date-only";

describe("serializeDateOnly", () => {
  it("preserves the local calendar day instead of converting it through UTC", () => {
    const localMidnight = new Date(2026, 7, 22);

    expect(serializeDateOnly(localMidnight)).toBe("2026-08-22");
  });

  it("keeps PostgreSQL date strings unchanged", () => {
    expect(serializeDateOnly("2026-08-22")).toBe("2026-08-22");
  });
});
