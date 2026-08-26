import {
  CAREGIVER_LANDING_PATH,
  COLLEAGUE_LANDING_PATH,
  FIRST_TOUCH_COOKIE_NAME,
  TEACHER_LANDING_PATH,
  buildCaregiverLandingAttribution,
  buildColleagueLandingAttribution,
  buildTeacherLandingAttribution,
  parseLandingAttribution,
  serializeLandingAttribution
} from "@/lib/landing-attribution";

describe("landing attribution", () => {
  const now = new Date("2026-08-21T08:00:00.000Z");

  it("captures allowlisted UTM values for the teacher landing", () => {
    expect(buildTeacherLandingAttribution({
      pathname: TEACHER_LANDING_PATH,
      search: "?utm_source=yandex&utm_medium=cpc&utm_campaign=teacher_september&utm_term=private",
      referrer: "https://yandex.ru/search/?text=private",
      siteHost: "slovesto.ru",
      now
    })).toEqual({
      landing_type: "teacher",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString(),
      utm_source: "yandex",
      utm_medium: "cpc",
      utm_campaign: "teacher_september",
      referrer_host: "yandex.ru"
    });
  });

  it("normalizes search referrers to organic source and medium", () => {
    expect(buildTeacherLandingAttribution({
      pathname: TEACHER_LANDING_PATH,
      search: "",
      referrer: "https://www.google.ru/search?q=private",
      siteHost: "slovesto.ru",
      now
    })).toMatchObject({
      utm_source: "google",
      utm_medium: "organic",
      referrer_host: "google.ru"
    });
  });

  it("does not treat an internal navigation as a referral", () => {
    expect(buildTeacherLandingAttribution({
      pathname: TEACHER_LANDING_PATH,
      search: "",
      referrer: "https://slovesto.ru/",
      siteHost: "www.slovesto.ru",
      now
    })).toEqual({
      landing_type: "teacher",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString()
    });
  });

  it("does not create teacher attribution for another route", () => {
    expect(buildTeacherLandingAttribution({ pathname: "/", search: "", now })).toBeNull();
  });

  it("captures a separate first touch for the caregiver landing", () => {
    const attribution = buildCaregiverLandingAttribution({
      pathname: CAREGIVER_LANDING_PATH,
      search: "?utm_source=yandex&utm_medium=organic&utm_campaign=caregiver_day",
      referrer: "https://yandex.ru/search/?text=otkrytka-vospitatelyu",
      siteHost: "slovesto.ru",
      now
    });

    expect(attribution).toEqual({
      landing_type: "caregiver",
      landing_path: CAREGIVER_LANDING_PATH,
      first_touch_at: now.toISOString(),
      utm_source: "yandex",
      utm_medium: "organic",
      utm_campaign: "caregiver_day",
      referrer_host: "yandex.ru"
    });
    expect(parseLandingAttribution(serializeLandingAttribution(attribution!))).toEqual(attribution);
  });

  it("captures a separate first touch for the colleague landing", () => {
    const attribution = buildColleagueLandingAttribution({
      pathname: COLLEAGUE_LANDING_PATH,
      search: "?utm_source=yandex&utm_medium=organic&utm_campaign=colleague_farewell",
      referrer: "https://yandex.ru/search/?text=gruppovaya-otkrytka-kollege",
      siteHost: "slovesto.ru",
      now
    });

    expect(attribution).toEqual({
      landing_type: "colleague",
      landing_path: COLLEAGUE_LANDING_PATH,
      first_touch_at: now.toISOString(),
      utm_source: "yandex",
      utm_medium: "organic",
      utm_campaign: "colleague_farewell",
      referrer_host: "yandex.ru"
    });
    expect(parseLandingAttribution(serializeLandingAttribution(attribution!))).toEqual(attribution);
  });

  it("rejects a landing type paired with another landing path", () => {
    expect(parseLandingAttribution(encodeURIComponent(JSON.stringify({
      landing_type: "caregiver",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString()
    })))).toBeNull();
  });

  it("round-trips the safe cookie payload and drops extra fields", () => {
    const serialized = encodeURIComponent(JSON.stringify({
      landing_type: "teacher",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString(),
      utm_source: "yandex",
      private_message: "must not survive"
    }));

    expect(parseLandingAttribution(serialized)).toEqual({
      landing_type: "teacher",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString(),
      utm_source: "yandex"
    });

    const attribution = buildTeacherLandingAttribution({ pathname: TEACHER_LANDING_PATH, search: "", now });
    expect(attribution).not.toBeNull();
    expect(parseLandingAttribution(serializeLandingAttribution(attribution!))).toEqual(attribution);
    expect(FIRST_TOUCH_COOKIE_NAME).toBe("slv_first_touch");
  });

  it("rejects malformed, oversized and mismatched cookie values", () => {
    expect(parseLandingAttribution("not-json")).toBeNull();
    expect(parseLandingAttribution("x".repeat(2_049))).toBeNull();
    expect(parseLandingAttribution(encodeURIComponent(JSON.stringify({
      landing_type: "other",
      landing_path: TEACHER_LANDING_PATH,
      first_touch_at: now.toISOString()
    })))).toBeNull();
  });
});
