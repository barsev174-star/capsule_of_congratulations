import {
  FIRST_TOUCH_COOKIE_NAME,
  FIRST_TOUCH_MAX_AGE_SECONDS,
  TEACHER_LANDING_PATH,
  buildTeacherLandingAttribution,
  parseLandingAttribution,
  serializeLandingAttribution,
  type TeacherLandingAttribution
} from "@/lib/landing-attribution";

const readCookie = (name: string) => {
  const prefix = `${name}=`;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item?.slice(prefix.length);
};

export const ensureTeacherFirstTouch = (): TeacherLandingAttribution | null => {
  if (typeof window === "undefined" || typeof document === "undefined") return null;

  const existing = parseLandingAttribution(readCookie(FIRST_TOUCH_COOKIE_NAME));
  if (existing) return existing;

  const attribution = buildTeacherLandingAttribution({
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

export const getTeacherTelemetryContext = (): Record<string, string> => {
  const attribution = ensureTeacherFirstTouch();
  return attribution ?? {
    landing_type: "teacher",
    landing_path: TEACHER_LANDING_PATH
  };
};
