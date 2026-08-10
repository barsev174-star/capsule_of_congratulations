import { describe, expect, it } from "vitest";
import {
  contentFocusSectionIds,
  getContentSectionForFocus,
  getContentSectionHref,
  getContentTabHref,
  getEditorTabCount,
  isContentFocus,
  isContentSection,
  isEditorTab,
  resolveEditorTab,
  resolveContentSection,
  openContentTab
} from "./content-focus";

describe("content focus navigation", () => {
  it("builds direct, reload-safe links for every design action", () => {
    expect(getContentTabHref("manage-token", "main-congratulation"))
      .toBe("/manage/manage-token?tab=congratulations&focus=main-congratulation");
    expect(openContentTab({ manageToken: "manage-token", focus: "congratulations-photos" }))
      .toBe("/manage/manage-token?tab=photos&focus=congratulations-photos");
    expect(getContentTabHref("manage-token", "moments-photos"))
      .toBe("/manage/manage-token?tab=photos&focus=moments-photos");
    expect(getContentSectionHref("manage-token", "photos"))
      .toBe("/manage/manage-token?tab=photos");
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

  it("resolves the subsection from an explicit URL value or a legacy focus target", () => {
    expect(isContentSection("congratulations")).toBe(true);
    expect(isContentSection("video")).toBe(false);
    expect(getContentSectionForFocus("main-congratulation")).toBe("congratulations");
    expect(getContentSectionForFocus("moments-photos")).toBe("photos");
    expect(resolveContentSection({ section: "photos", focus: null })).toBe("photos");
    expect(resolveContentSection({ section: "unknown", focus: "congratulations-photos" }))
      .toBe("photos");
    expect(resolveContentSection({ section: undefined, focus: null })).toBe("congratulations");
  });

  it("resolves four direct tabs and keeps legacy content URLs compatible", () => {
    expect(isEditorTab("congratulations")).toBe(true);
    expect(isEditorTab("content")).toBe(false);
    expect(resolveEditorTab({ tab: "photos", section: undefined, focus: null }))
      .toBe("photos");
    expect(resolveEditorTab({ tab: "content", section: "photos", focus: null }))
      .toBe("photos");
    expect(resolveEditorTab({
      tab: "content",
      section: undefined,
      focus: "congratulations-photos"
    })).toBe("photos");
    expect(resolveEditorTab({ tab: "unknown", section: undefined, focus: null }))
      .toBe("design");
  });

  it("uses the vote total for the mobile gift-tab counter", () => {
    const counts = { congratulations: 12, photos: 5, giftVotes: 9 };

    expect(getEditorTabCount("congratulations", counts)).toBe(12);
    expect(getEditorTabCount("photos", counts)).toBe(5);
    expect(getEditorTabCount("gift", counts)).toBe(9);
    expect(getEditorTabCount("design", counts)).toBeNull();
  });
});
