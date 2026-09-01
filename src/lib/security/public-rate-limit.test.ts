import { beforeEach, describe, expect, it } from "vitest";
import {
  consumePublicRateLimit,
  getPublicClientKey,
  rateLimitHeaders,
  resetPublicRateLimitsForTests
} from "./public-rate-limit";

describe("public request rate limiting", () => {
  beforeEach(resetPublicRateLimitsForTests);

  it("uses the proxy-provided client address without exposing it", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.1, 198.51.100.8" });
    const key = getPublicClientKey(headers);
    expect(key).toHaveLength(24);
    expect(key).not.toContain("198.51.100.8");
  });

  it("allows requests through the limit and returns a retry window afterwards", () => {
    const first = consumePublicRateLimit({ scope: "test", clientKey: "client", limit: 2, windowMs: 60_000, now: 1_000 });
    const second = consumePublicRateLimit({ scope: "test", clientKey: "client", limit: 2, windowMs: 60_000, now: 2_000 });
    const blocked = consumePublicRateLimit({ scope: "test", clientKey: "client", limit: 2, windowMs: 60_000, now: 3_000 });
    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 58 });
    expect(rateLimitHeaders(blocked)).toMatchObject({ "Retry-After": "58", "X-RateLimit-Limit": "2" });
  });

  it("starts a fresh bucket after the window", () => {
    consumePublicRateLimit({ scope: "test", clientKey: "client", limit: 1, windowMs: 100, now: 1_000 });
    const next = consumePublicRateLimit({ scope: "test", clientKey: "client", limit: 1, windowMs: 100, now: 1_101 });
    expect(next).toMatchObject({ allowed: true, remaining: 0 });
  });
});
