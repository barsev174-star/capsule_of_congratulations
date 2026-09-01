import { describe, expect, it } from "vitest";
import { appSecurityHeaders } from "./headers";

describe("application security headers", () => {
  const headers = new Map(appSecurityHeaders.map((header) => [header.key, header.value]));

  it("protects media sniffing, referrers and browser capabilities", () => {
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("allows same-origin previews while blocking foreign embedding and plugins", () => {
    expect(headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("https://auth.robokassa.ru");
  });
});
