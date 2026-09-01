import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetPublicRateLimitsForTests } from "@/lib/security/public-rate-limit";
import { POST } from "./route";

const originalLimit = process.env.PUBLIC_CONTRIBUTION_RATE_LIMIT;

describe("POST /api/contributions public protection", () => {
  beforeEach(() => {
    resetPublicRateLimitsForTests();
    process.env.PUBLIC_CONTRIBUTION_RATE_LIMIT = "1";
  });

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.PUBLIC_CONTRIBUTION_RATE_LIMIT;
    else process.env.PUBLIC_CONTRIBUTION_RATE_LIMIT = originalLimit;
  });

  const invalidRequest = () => new Request("http://localhost/api/contributions", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.16" },
    body: new FormData()
  });

  it("limits repeated submissions for the same card and client", async () => {
    const first = await POST(invalidRequest());
    expect(first.status).toBe(400);
    const blocked = await POST(invalidRequest());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("x-ratelimit-limit")).toBe("1");
  });
});
