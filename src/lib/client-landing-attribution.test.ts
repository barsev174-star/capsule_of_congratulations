import { saveAnalyticsConsent } from "@/lib/client-analytics-consent";
import {
  ensureCurrentLandingFirstTouch,
  ensureHomeFirstTouch,
  ensureTeacherFirstTouch,
  removeFirstTouchCookie
} from "@/lib/client-landing-attribution";
import { FIRST_TOUCH_COOKIE_NAME, parseLandingAttribution, TEACHER_LANDING_PATH } from "@/lib/landing-attribution";

describe("client landing attribution consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", TEACHER_LANDING_PATH);
    removeFirstTouchCookie();
  });

  it("does not create first-touch attribution before analytics consent", () => {
    expect(ensureTeacherFirstTouch()).toBeNull();
    expect(document.cookie).not.toContain(`${FIRST_TOUCH_COOKIE_NAME}=`);
  });

  it("creates attribution after consent and deletes it on removal", () => {
    saveAnalyticsConsent("accepted");
    expect(ensureCurrentLandingFirstTouch()).toMatchObject({
      landing_type: "teacher",
      landing_path: TEACHER_LANDING_PATH
    });
    expect(document.cookie).toContain(`${FIRST_TOUCH_COOKIE_NAME}=`);

    removeFirstTouchCookie();
    expect(document.cookie).not.toContain(`${FIRST_TOUCH_COOKIE_NAME}=`);
  });

  it("preserves the first homepage campaign through a thematic page and a return visit", () => {
    window.history.replaceState({}, "", "/?utm_source=telegram&utm_campaign=launch");
    expect(ensureHomeFirstTouch()).toBeNull();
    saveAnalyticsConsent("accepted");
    const first = ensureCurrentLandingFirstTouch();
    expect(first).toMatchObject({ landing_type: "home", utm_source: "telegram", utm_campaign: "launch" });
    window.history.replaceState({}, "", `${TEACHER_LANDING_PATH}?utm_source=other`);
    expect(ensureTeacherFirstTouch()).toBeNull();
    const raw = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${FIRST_TOUCH_COOKIE_NAME}=`))?.slice(FIRST_TOUCH_COOKIE_NAME.length + 1);
    expect(parseLandingAttribution(raw)).toEqual(first);
    window.history.replaceState({}, "", "/?utm_source=other");
    expect(ensureHomeFirstTouch()).toEqual(first);
  });
});
