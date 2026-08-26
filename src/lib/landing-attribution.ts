export const FIRST_TOUCH_COOKIE_NAME = "slv_first_touch";
export const FIRST_TOUCH_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
export const TEACHER_LANDING_PATH = "/gruppovaya-otkrytka/uchitelyu";
export const CAREGIVER_LANDING_PATH = "/gruppovaya-otkrytka/vospitatelyu";
export const COLLEAGUE_LANDING_PATH = "/gruppovaya-otkrytka/kollege";
export const BIRTHDAY_LANDING_PATH = "/gruppovaya-otkrytka/den-rozhdeniya";

const MAX_COOKIE_LENGTH = 2_048;
const MAX_VALUE_LENGTH = 100;

type LandingAttributionFields = {
  first_touch_at: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer_host?: string;
};

export type TeacherLandingAttribution = LandingAttributionFields & {
  landing_type: "teacher";
  landing_path: typeof TEACHER_LANDING_PATH;
};

export type CaregiverLandingAttribution = LandingAttributionFields & {
  landing_type: "caregiver";
  landing_path: typeof CAREGIVER_LANDING_PATH;
};

export type ColleagueLandingAttribution = LandingAttributionFields & {
  landing_type: "colleague";
  landing_path: typeof COLLEAGUE_LANDING_PATH;
};

export type BirthdayLandingAttribution = LandingAttributionFields & {
  landing_type: "birthday";
  landing_path: typeof BIRTHDAY_LANDING_PATH;
};

export type LandingAttribution = TeacherLandingAttribution | CaregiverLandingAttribution | ColleagueLandingAttribution | BirthdayLandingAttribution;

type BuildLandingAttributionInput = {
  pathname: string;
  search: string | URLSearchParams;
  referrer?: string;
  siteHost?: string;
  now?: Date;
};

const sanitizeValue = (value: string | null | undefined) => {
  if (!value) return undefined;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_VALUE_LENGTH);
  return normalized || undefined;
};

const normalizeHost = (value: string | undefined) => value?.trim().toLowerCase().replace(/^www\./, "");

const getReferrerHost = (referrer: string | undefined) => {
  if (!referrer) return undefined;
  try {
    return normalizeHost(new URL(referrer).hostname);
  } catch {
    return undefined;
  }
};

const isGoogleHost = (host: string) => host === "google.com" || host.startsWith("google.") || host.includes(".google.");
const isYandexHost = (host: string) => host === "ya.ru" || host === "yandex.ru" || host.startsWith("yandex.") || host.includes(".yandex.");

const buildLandingAttribution = ({
  pathname,
  search,
  referrer,
  siteHost,
  now = new Date()
}: BuildLandingAttributionInput, landingType: LandingAttribution["landing_type"]): LandingAttribution | null => {
  const landingPath = {
    teacher: TEACHER_LANDING_PATH,
    caregiver: CAREGIVER_LANDING_PATH,
    colleague: COLLEAGUE_LANDING_PATH,
    birthday: BIRTHDAY_LANDING_PATH
  }[landingType];
  if (pathname !== landingPath) return null;

  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const referrerHost = getReferrerHost(referrer);
  const normalizedSiteHost = normalizeHost(siteHost);
  const isInternalReferrer = Boolean(referrerHost && normalizedSiteHost && referrerHost === normalizedSiteHost);
  let utmSource = sanitizeValue(params.get("utm_source"));
  let utmMedium = sanitizeValue(params.get("utm_medium"));
  const utmCampaign = sanitizeValue(params.get("utm_campaign"));

  if (!utmSource && !utmMedium && referrerHost && !isInternalReferrer) {
    if (isGoogleHost(referrerHost)) {
      utmSource = "google";
      utmMedium = "organic";
    } else if (isYandexHost(referrerHost)) {
      utmSource = "yandex";
      utmMedium = "organic";
    } else {
      utmSource = referrerHost;
      utmMedium = "referral";
    }
  }

  return {
    landing_type: landingType,
    landing_path: landingPath,
    first_touch_at: now.toISOString(),
    ...(utmSource ? { utm_source: utmSource } : {}),
    ...(utmMedium ? { utm_medium: utmMedium } : {}),
    ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
    ...(referrerHost && !isInternalReferrer ? { referrer_host: referrerHost } : {})
  } as LandingAttribution;
};

export const buildTeacherLandingAttribution = (input: BuildLandingAttributionInput): TeacherLandingAttribution | null =>
  buildLandingAttribution(input, "teacher") as TeacherLandingAttribution | null;

export const buildCaregiverLandingAttribution = (input: BuildLandingAttributionInput): CaregiverLandingAttribution | null =>
  buildLandingAttribution(input, "caregiver") as CaregiverLandingAttribution | null;

export const buildColleagueLandingAttribution = (input: BuildLandingAttributionInput): ColleagueLandingAttribution | null =>
  buildLandingAttribution(input, "colleague") as ColleagueLandingAttribution | null;

export const buildBirthdayLandingAttribution = (input: BuildLandingAttributionInput): BirthdayLandingAttribution | null =>
  buildLandingAttribution(input, "birthday") as BirthdayLandingAttribution | null;

export const serializeLandingAttribution = (value: LandingAttribution) =>
  encodeURIComponent(JSON.stringify(value));

export const parseLandingAttribution = (rawValue: string | null | undefined): LandingAttribution | null => {
  if (!rawValue || rawValue.length > MAX_COOKIE_LENGTH) return null;

  try {
    const decoded = decodeURIComponent(rawValue);
    const value = JSON.parse(decoded) as Record<string, unknown>;
    const isTeacher = value.landing_type === "teacher" && value.landing_path === TEACHER_LANDING_PATH;
    const isCaregiver = value.landing_type === "caregiver" && value.landing_path === CAREGIVER_LANDING_PATH;
    const isColleague = value.landing_type === "colleague" && value.landing_path === COLLEAGUE_LANDING_PATH;
    const isBirthday = value.landing_type === "birthday" && value.landing_path === BIRTHDAY_LANDING_PATH;
    if (
      (!isTeacher && !isCaregiver && !isColleague && !isBirthday) ||
      typeof value.first_touch_at !== "string" ||
      !Number.isFinite(Date.parse(value.first_touch_at))
    ) {
      return null;
    }

    const utmSource = sanitizeValue(typeof value.utm_source === "string" ? value.utm_source : undefined);
    const utmMedium = sanitizeValue(typeof value.utm_medium === "string" ? value.utm_medium : undefined);
    const utmCampaign = sanitizeValue(typeof value.utm_campaign === "string" ? value.utm_campaign : undefined);
    const referrerHost = sanitizeValue(typeof value.referrer_host === "string" ? normalizeHost(value.referrer_host) : undefined);

    return {
      landing_type: isTeacher ? "teacher" : isCaregiver ? "caregiver" : isColleague ? "colleague" : "birthday",
      landing_path: isTeacher ? TEACHER_LANDING_PATH : isCaregiver ? CAREGIVER_LANDING_PATH : isColleague ? COLLEAGUE_LANDING_PATH : BIRTHDAY_LANDING_PATH,
      first_touch_at: value.first_touch_at,
      ...(utmSource ? { utm_source: utmSource } : {}),
      ...(utmMedium ? { utm_medium: utmMedium } : {}),
      ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
      ...(referrerHost ? { referrer_host: referrerHost } : {})
    } as LandingAttribution;
  } catch {
    return null;
  }
};

