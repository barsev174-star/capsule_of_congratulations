import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  generateAdminPassword,
  getAdminAuthEnv,
  hashAdminPassword,
  verifyAdminPassword,
  verifyAdminSessionToken
} from "./auth";

describe("admin auth", () => {
  describe("password hashing", () => {
    it("hashes and verifies a password", () => {
      const { salt, hash } = generateAdminPassword("my-secret-password");

      expect(salt).toHaveLength(32);
      expect(hash).toHaveLength(128);
      expect(verifyAdminPassword("my-secret-password", hash, salt)).toBe(true);
      expect(verifyAdminPassword("wrong-password", hash, salt)).toBe(false);
    });

    it("returns false for mismatched hash length", () => {
      expect(verifyAdminPassword("password", "short", "salt")).toBe(false);
    });

    it("produces deterministic hash for same salt", () => {
      const salt = "a1b2c3d4e5f6a7b8";
      const hash1 = hashAdminPassword("password", salt);
      const hash2 = hashAdminPassword("password", salt);

      expect(hash1).toBe(hash2);
    });
  });

  describe("session token", () => {
    it("creates and verifies a valid token", () => {
      const secret = "a".repeat(64);
      const token = createAdminSessionToken("admin@example.com", "admin", secret);
      const payload = verifyAdminSessionToken(token, secret);

      expect(payload).not.toBeNull();
      expect(payload?.email).toBe("admin@example.com");
      expect(payload?.role).toBe("admin");
      expect(payload?.exp).toBeGreaterThan(Date.now());
    });

    it("rejects a token signed with a different secret", () => {
      const token = createAdminSessionToken("admin@example.com", "admin", "secret-a");
      expect(verifyAdminSessionToken(token, "secret-b")).toBeNull();
    });

    it("rejects a malformed token", () => {
      expect(verifyAdminSessionToken("not-a-token", "secret")).toBeNull();
    });

    it("rejects a tampered token", () => {
      const secret = "a".repeat(64);
      const token = createAdminSessionToken("admin@example.com", "admin", secret);
      const tampered = `${token.slice(0, -1)}X`;

      expect(verifyAdminSessionToken(tampered, secret)).toBeNull();
    });
  });

  describe("getAdminAuthEnv", () => {
    it("throws when env variables are missing", () => {
      expect(() => getAdminAuthEnv()).toThrow("Admin auth environment variables are not configured.");
    });
  });
});
