import { describe, expect, it } from "vitest";
import { createOrganizerSessionToken, verifyOrganizerSessionToken } from "./auth";

describe("organizer session token", () => {
  const secret = "a-long-test-secret";
  const now = Date.UTC(2026, 6, 3);

  it("round-trips a normalized email", () => {
    const token = createOrganizerSessionToken("User@Example.com", secret, now);
    expect(verifyOrganizerSessionToken(token, secret, now + 1000)?.email).toBe("user@example.com");
  });

  it("rejects a modified signature", () => {
    const token = createOrganizerSessionToken("user@example.com", secret, now);
    expect(verifyOrganizerSessionToken(`${token}x`, secret, now)).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = createOrganizerSessionToken("user@example.com", secret, now);
    expect(verifyOrganizerSessionToken(token, secret, now + 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});
