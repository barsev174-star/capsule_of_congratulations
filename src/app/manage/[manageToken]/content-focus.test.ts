import { describe, expect, it } from "vitest";
import {
  contentFocusSectionIds,
  getContentTabHref,
  isContentFocus,
  openContentTab
} from "./content-focus";

describe("content focus navigation", () => {
  it("builds direct, reload-safe links for every design action", () => {
    expect(getContentTabHref("manage-token", "main-congratulation"))
      .toBe("/manage/manage-token?tab=content&focus=main-congratulation");
    expect(openContentTab({ manageToken: "manage-token", focus: "congratulations-photos" }))
      .toBe("/manage/manage-token?tab=content&focus=congratulations-photos");
    expect(getContentTabHref("manage-token", "moments-photos"))
      .toBe("/manage/manage-token?tab=content&focus=moments-photos");
  });

  it("accepts only known focus targets with matching stable section ids", () => {
    expect(isContentFocus("main-congratulation")).toBe(true);
    expect(isContentFocus("random-card")).toBe(false);
    expect(contentFocusSectionIds).toEqual({
      "main-congratulation": "main-congratulation",
      "congratulations-photos": "congratulations-photos",
      "moments-photos": "moments-photos"
    });
  });
});
