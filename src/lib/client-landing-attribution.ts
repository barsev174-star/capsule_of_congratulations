import {
  CAREGIVER_LANDING_PATH,
  FIRST_TOUCH_COOKIE_NAME,
  FIRST_TOUCH_MAX_AGE_SECONDS,
  TEACHER_LANDING_PATH,
  buildCaregiverLandingAttribution,
  buildTeacherLandingAttribution,
  parseLandingAttribution,
  serializeLandingAttribution,
  type CaregiverLandingAttribution,
  type LandingAttribution,
  type TeacherLandingAttribution
} from "@/lib/landing-attribution";

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

export const ensureTeacherFirstTouch = (): TeacherLandingAttribution | null =>
  ensureFirstTouch(TEACHER_LANDING_PATH, buildTeacherLandingAttribution);

export const ensureCaregiverFirstTouch = (): CaregiverLandingAttribution | null =>
  ensureFirstTouch(CAREGIVER_LANDING_PATH, buildCaregiverLandingAttribution);

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
