import { afterEach, describe, expect, it } from "vitest";
import { getGiftUrl, getJoinPath, getJoinUrl, getManageUrl, getPreviewUrl } from "./card-links";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe("card link helpers", () => {
  it("builds MVP paths without a configured site URL", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getJoinPath("abc")).toBe("/join/abc");
    expect(getJoinUrl("abc")).toBe("/join/abc");
    expect(getGiftUrl("gift")).toBe("/gift/gift");
    expect(getManageUrl("token")).toBe("/manage/token");
    expect(getPreviewUrl("token")).toBe("/preview/token");
  });

  it("builds absolute URLs from NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://steplom.ru/";

    expect(getJoinUrl("abc")).toBe("https://steplom.ru/join/abc");
    expect(getGiftUrl("gift")).toBe("https://steplom.ru/gift/gift");
    expect(getManageUrl("token")).toBe("https://steplom.ru/manage/token");
    expect(getPreviewUrl("token")).toBe("https://steplom.ru/preview/token");
  });
});
