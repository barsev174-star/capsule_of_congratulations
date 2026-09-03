import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
  createEmptyCardDraft: vi.fn(),
  getManagePath: vi.fn(),
  reportCriticalError: vi.fn(),
  trackFunnel: vi.fn(),
  parseLandingAttribution: vi.fn(),
  getOrganizerSession: vi.fn(),
  grantNewDraftAccess: vi.fn(),
  claimCardOrganizerEmail: vi.fn()
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock("@/lib/organizer/session", () => ({ getOrganizerSession: mocks.getOrganizerSession }));
vi.mock("@/lib/manage/draft-session", () => ({ grantNewDraftAccess: mocks.grantNewDraftAccess }));
vi.mock("@/lib/cards/repository", () => ({ claimCardOrganizerEmail: mocks.claimCardOrganizerEmail }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/cards/service", () => ({ createEmptyCardDraft: mocks.createEmptyCardDraft }));
vi.mock("@/lib/routes/card-links", () => ({ getManagePath: mocks.getManagePath }));
vi.mock("@/lib/telemetry", () => ({
  reportCriticalError: mocks.reportCriticalError,
  trackFunnel: mocks.trackFunnel
}));
vi.mock("@/lib/landing-attribution", () => ({
  FIRST_TOUCH_COOKIE_NAME: "slv_first_touch",
  parseLandingAttribution: mocks.parseLandingAttribution
}));

import {
  startBirthdayCardFromShowcaseAction,
  startCardFromExampleSelectionAction,
  startCardFromShowcaseAction,
  startCardFromTemplateAction,
  startCaregiverCardFromShowcaseAction,
  startColleagueCardFromShowcaseAction,
  startTeacherCardFromShowcaseAction
} from "@/app/home-actions";

describe("landing card creation actions", () => {
  const attribution = {
    landing_type: "teacher",
    landing_path: "/gruppovaya-otkrytka/uchitelyu",
    utm_source: "yandex"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrganizerSession.mockResolvedValue(null);
    mocks.claimCardOrganizerEmail.mockResolvedValue({ id: "created-card-id" });
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "encoded-first-touch" }))
    });
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}` }));
    mocks.parseLandingAttribution.mockReturnValue(attribution);
    mocks.createEmptyCardDraft.mockResolvedValue({
      card: { id: "created-card-id", manageToken: "manage-token" }
    });
    mocks.getManagePath.mockReturnValue("/manage/manage-token");
  });

  it("keeps the generic action template-neutral", async () => {
    await startCardFromShowcaseAction();

    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_creation_started", {
      source: "landing",
      ...attribution
    });
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution);
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
    expect(mocks.grantNewDraftAccess).toHaveBeenCalledWith("created-card-id");
    expect(mocks.getManagePath).toHaveBeenCalledWith("created-card-id");
    expect(mocks.claimCardOrganizerEmail).not.toHaveBeenCalled();
  });

  it("assigns a new card to an already verified organizer without granting guest access", async () => {
    mocks.getOrganizerSession.mockResolvedValue({ email: "verified@example.com" });
    await startCardFromShowcaseAction();
    expect(mocks.claimCardOrganizerEmail).toHaveBeenCalledWith("created-card-id", "verified@example.com");
    expect(mocks.grantNewDraftAccess).not.toHaveBeenCalled();
  });

  it("keeps a homepage campaign when creating from the example or a thematic page", async () => {
    const homeAttribution = { landing_type: "home", landing_path: "/", utm_source: "telegram", utm_campaign: "launch" };
    mocks.parseLandingAttribution.mockReturnValue(homeAttribution);
    await startCardFromExampleSelectionAction(new FormData());
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(homeAttribution);
    await startTeacherCardFromShowcaseAction();
    expect(mocks.createEmptyCardDraft).toHaveBeenLastCalledWith(homeAttribution, { templateId: "school-classic" });
  });

  it("starts a birthday draft with the fixed template, occasion and first touch", async () => {
    const birthdayAttribution = { ...attribution, landing_type: "birthday", landing_path: "/gruppovaya-otkrytka/den-rozhdeniya" };
    mocks.parseLandingAttribution.mockReturnValue(birthdayAttribution);
    await startBirthdayCardFromShowcaseAction();
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(birthdayAttribution, {
      templateId: "paper-birthday", occasionText: "С днём рождения!"
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
  });

  it("preserves a published template from the opened card", async () => {
    await startCardFromTemplateAction("team-editorial");
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution, { templateId: "team-editorial" });
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
  });

  it("creates a demo draft from a validated template and reveal combination", async () => {
    const formData = new FormData();
    formData.set("templateId", "school-classic");
    formData.set("giftAnimationId", "collect-messages");

    await startCardFromExampleSelectionAction(formData);

    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_creation_started", {
      source: "demo_page",
      ...attribution,
      templateId: "school-classic",
      giftAnimationId: "collect-messages"
    });
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution, {
      templateId: "school-classic",
      giftAnimationId: "collect-messages"
    });
  });

  it("falls back to an ordinary draft for an invalid demo combination", async () => {
    const formData = new FormData();
    formData.set("templateId", "../../admin");
    formData.set("giftAnimationId", "unknown-reveal");

    await startCardFromExampleSelectionAction(formData);

    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution);
  });

  it.each(["unknown-template", "../../admin", ""])("rejects unavailable template %s", async (templateId) => {
    await expect(startCardFromTemplateAction(templateId)).rejects.toThrow("Этот шаблон недоступен");
    expect(mocks.createEmptyCardDraft).not.toHaveBeenCalled();
  });

  it("hard-codes school-classic for the teacher action", async () => {
    const untrustedFormData = new FormData();
    untrustedFormData.set("templateId", "paper-birthday");

    await (startTeacherCardFromShowcaseAction as unknown as (data: FormData) => Promise<void>)(untrustedFormData);

    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_creation_started", {
      source: "landing",
      ...attribution,
      templateId: "school-classic"
    });
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution, {
      templateId: "school-classic"
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
  });

  it("hard-codes kindergarten-doodles for the caregiver action", async () => {
    const untrustedFormData = new FormData();
    untrustedFormData.set("templateId", "paper-birthday");

    await (startCaregiverCardFromShowcaseAction as unknown as (data: FormData) => Promise<void>)(untrustedFormData);

    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_creation_started", {
      source: "landing",
      ...attribution,
      templateId: "kindergarten-doodles"
    });
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution, {
      templateId: "kindergarten-doodles"
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
  });

  it("hard-codes team-editorial for the colleague action", async () => {
    const untrustedFormData = new FormData();
    untrustedFormData.set("templateId", "paper-birthday");

    await (startColleagueCardFromShowcaseAction as unknown as (data: FormData) => Promise<void>)(untrustedFormData);

    expect(mocks.trackFunnel).toHaveBeenCalledWith("funnel.card_creation_started", {
      source: "landing",
      ...attribution,
      templateId: "team-editorial"
    });
    expect(mocks.createEmptyCardDraft).toHaveBeenCalledWith(attribution, {
      templateId: "team-editorial"
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/manage/manage-token");
  });
});
