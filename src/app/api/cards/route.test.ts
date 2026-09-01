import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetPublicRateLimitsForTests } from "@/lib/security/public-rate-limit";
import { POST } from "./route";

const originalLimit = process.env.PUBLIC_CARD_CREATE_RATE_LIMIT;

describe("POST /api/cards public protection", () => {
  beforeEach(() => {
    resetPublicRateLimitsForTests();
    process.env.PUBLIC_CARD_CREATE_RATE_LIMIT = "1";
  });

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.PUBLIC_CARD_CREATE_RATE_LIMIT;
    else process.env.PUBLIC_CARD_CREATE_RATE_LIMIT = originalLimit;
  });

  const invalidRequest = () => new Request("http://localhost/api/cards", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.15" },
    body: new FormData()
  });

  it("rejects bursts before parsing or creating another draft", async () => {
    expect((await POST(invalidRequest())).status).toBe(400);
    const blocked = await POST(invalidRequest());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });
});
