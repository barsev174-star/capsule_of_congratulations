import { describe, expect, it } from "vitest";
import { adminRoleSatisfies } from "./permissions";

describe("adminRoleSatisfies", () => {
  it("allows administrators to access every role level", () => {
    expect(adminRoleSatisfies("admin", "admin")).toBe(true);
    expect(adminRoleSatisfies("admin", "moderator")).toBe(true);
    expect(adminRoleSatisfies("admin", "support")).toBe(true);
  });

  it("keeps moderator and support boundaries", () => {
    expect(adminRoleSatisfies("moderator", "admin")).toBe(false);
    expect(adminRoleSatisfies("moderator", "moderator")).toBe(true);
    expect(adminRoleSatisfies("support", "moderator")).toBe(false);
    expect(adminRoleSatisfies("support", "support")).toBe(true);
  });
});
