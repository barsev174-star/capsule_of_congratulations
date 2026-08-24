import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  createEmptyCardDraft: vi.fn(),
  getManagePath: vi.fn(),
  reportCriticalError: vi.fn(),
  trackFunnel: vi.fn(),
  parseLandingAttribution: vi.fn()
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
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
  startCardFromShowcaseAction,
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
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "encoded-first-touch" }))
    });
    mocks.parseLandingAttribution.mockReturnValue(attribution);
    mocks.createEmptyCardDraft.mockResolvedValue({
      card: { manageToken: "manage-token" }
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
});
