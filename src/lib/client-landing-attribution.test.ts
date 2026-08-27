import { saveAnalyticsConsent } from "@/lib/client-analytics-consent";
import {
  ensureCurrentLandingFirstTouch,
  ensureTeacherFirstTouch,
  removeFirstTouchCookie
} from "@/lib/client-landing-attribution";
import { FIRST_TOUCH_COOKIE_NAME, TEACHER_LANDING_PATH } from "@/lib/landing-attribution";

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
});
