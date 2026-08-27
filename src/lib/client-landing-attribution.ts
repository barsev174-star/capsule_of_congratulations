import {
  BIRTHDAY_LANDING_PATH,
  buildBirthdayLandingAttribution,
  type BirthdayLandingAttribution,
  CAREGIVER_LANDING_PATH,
  COLLEAGUE_LANDING_PATH,
  FIRST_TOUCH_COOKIE_NAME,
  FIRST_TOUCH_MAX_AGE_SECONDS,
  TEACHER_LANDING_PATH,
  buildCaregiverLandingAttribution,
  buildColleagueLandingAttribution,
  buildTeacherLandingAttribution,
  parseLandingAttribution,
  serializeLandingAttribution,
  type CaregiverLandingAttribution,
  type ColleagueLandingAttribution,
  type LandingAttribution,
  type TeacherLandingAttribution
} from "@/lib/landing-attribution";
import { hasAcceptedAnalyticsConsent } from "@/lib/client-analytics-consent";

const readCookie = (name: string) => {
  const prefix = `${name}=`;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item?.slice(prefix.length);
};

const ensureFirstTouch = <T extends LandingAttribution>(
  landingPath: string,
  buildAttribution: (input: {
    pathname: string;
    search: string;
    referrer?: string;
    siteHost?: string;
  }) => T | null
): T | null => {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (!hasAcceptedAnalyticsConsent()) return null;

  const existing = parseLandingAttribution(readCookie(FIRST_TOUCH_COOKIE_NAME));
  if (existing) return existing.landing_path === landingPath ? existing as T : null;

  const attribution = buildAttribution({
    pathname: window.location.pathname,
    search: window.location.search,
    referrer: document.referrer,
    siteHost: window.location.hostname
  });
  if (!attribution) return null;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${FIRST_TOUCH_COOKIE_NAME}=${serializeLandingAttribution(attribution)}; Max-Age=${FIRST_TOUCH_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  return attribution;
};

export const removeFirstTouchCookie = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${FIRST_TOUCH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
};

export const ensureTeacherFirstTouch = (): TeacherLandingAttribution | null =>
  ensureFirstTouch(TEACHER_LANDING_PATH, buildTeacherLandingAttribution);

export const ensureCaregiverFirstTouch = (): CaregiverLandingAttribution | null =>
  ensureFirstTouch(CAREGIVER_LANDING_PATH, buildCaregiverLandingAttribution);

export const ensureColleagueFirstTouch = (): ColleagueLandingAttribution | null =>
  ensureFirstTouch(COLLEAGUE_LANDING_PATH, buildColleagueLandingAttribution);

export const ensureBirthdayFirstTouch = (): BirthdayLandingAttribution | null =>
  ensureFirstTouch(BIRTHDAY_LANDING_PATH, buildBirthdayLandingAttribution);

export const ensureCurrentLandingFirstTouch = (): LandingAttribution | null => {
  if (typeof window === "undefined") return null;
  if (window.location.pathname === TEACHER_LANDING_PATH) return ensureTeacherFirstTouch();
  if (window.location.pathname === CAREGIVER_LANDING_PATH) return ensureCaregiverFirstTouch();
  if (window.location.pathname === COLLEAGUE_LANDING_PATH) return ensureColleagueFirstTouch();
  if (window.location.pathname === BIRTHDAY_LANDING_PATH) return ensureBirthdayFirstTouch();
  return null;
};

export const getBirthdayTelemetryContext = (): Record<string, string> =>
  ensureBirthdayFirstTouch() ?? {
    landing_type: "birthday",
    landing_path: BIRTHDAY_LANDING_PATH
  };

export const getTeacherTelemetryContext = (): Record<string, string> => {
  const attribution = ensureTeacherFirstTouch();
  return attribution ?? {
    landing_type: "teacher",
    landing_path: TEACHER_LANDING_PATH
  };
};

export const getCaregiverTelemetryContext = (): Record<string, string> => {
  const attribution = ensureCaregiverFirstTouch();
  return attribution ?? {
    landing_type: "caregiver",
    landing_path: CAREGIVER_LANDING_PATH
  };
};

export const getColleagueTelemetryContext = (): Record<string, string> => {
  const attribution = ensureColleagueFirstTouch();
  return attribution ?? {
    landing_type: "colleague",
    landing_path: COLLEAGUE_LANDING_PATH
  };
};
