import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_CONSENT_TTL_MS,
  LEGACY_ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  saveAnalyticsConsent
} from "@/lib/client-analytics-consent";

describe("analytics consent storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("stores a versioned decision with timestamps and removes the legacy value", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    window.localStorage.setItem(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY, "accepted");

    saveAnalyticsConsent("accepted", now);

    expect(readAnalyticsConsent(now)).toBe("accepted");
    expect(window.localStorage.getItem(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) ?? "{}")).toEqual({
      decision: "accepted",
      consentVersion: "2026-08-26",
      privacyVersion: "2026-08-28",
      decidedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ANALYTICS_CONSENT_TTL_MS).toISOString()
    });
  });

  it("requires a new choice after expiry or a malformed stored value", () => {
    const now = new Date("2026-08-26T10:00:00.000Z");
    saveAnalyticsConsent("declined", now);
    expect(readAnalyticsConsent(new Date(now.getTime() + ANALYTICS_CONSENT_TTL_MS + 1))).toBe("unset");

    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    expect(readAnalyticsConsent(now)).toBe("unset");
  });
});
