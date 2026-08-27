"use client";

import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const ANALYTICS_CONSENT_STORAGE_KEY = "slovesto_analytics_consent_v2";
export const LEGACY_ANALYTICS_CONSENT_STORAGE_KEY = "slovesto_analytics_consent_v1";
export const ANALYTICS_CONSENT_VERSION = LEGAL_VERSIONS.analyticsConsent;
export const ANALYTICS_CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1_000;

export type AnalyticsConsentDecision = "accepted" | "declined";
export type AnalyticsConsent = AnalyticsConsentDecision | "unset";

type StoredAnalyticsConsent = {
  decision: AnalyticsConsentDecision;
  consentVersion: string;
  privacyVersion: string;
  decidedAt: string;
  expiresAt: string;
};

const isDecision = (value: unknown): value is AnalyticsConsentDecision =>
  value === "accepted" || value === "declined";

export const readAnalyticsConsent = (now = new Date()): AnalyticsConsent => {
  try {
    const raw = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!raw) return "unset";

    const stored = JSON.parse(raw) as Partial<StoredAnalyticsConsent>;
    const decidedAt = typeof stored.decidedAt === "string" ? Date.parse(stored.decidedAt) : Number.NaN;
    const expiresAt = typeof stored.expiresAt === "string" ? Date.parse(stored.expiresAt) : Number.NaN;
    if (
      !isDecision(stored.decision) ||
      stored.consentVersion !== ANALYTICS_CONSENT_VERSION ||
      stored.privacyVersion !== LEGAL_VERSIONS.privacy ||
      !Number.isFinite(decidedAt) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= now.getTime()
    ) {
      return "unset";
    }

    return stored.decision;
  } catch {
    return "unset";
  }
};

export const saveAnalyticsConsent = (decision: AnalyticsConsentDecision, now = new Date()) => {
  const stored: StoredAnalyticsConsent = {
    decision,
    consentVersion: ANALYTICS_CONSENT_VERSION,
    privacyVersion: LEGAL_VERSIONS.privacy,
    decidedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ANALYTICS_CONSENT_TTL_MS).toISOString()
  };

  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, JSON.stringify(stored));
    window.localStorage.removeItem(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY);
  } catch {
    // A blocked storage API keeps the choice session-only.
  }
};

export const hasAcceptedAnalyticsConsent = () => readAnalyticsConsent() === "accepted";
