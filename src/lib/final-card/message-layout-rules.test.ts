import { getFinalCardMessageLayoutProfile, splitIntoMessagePages } from "@/lib/final-card/message-layout-rules";

describe("getFinalCardMessageLayoutProfile", () => {
  it("keeps grid 2x2 stable", () => {
    const profile = getFinalCardMessageLayoutProfile("grid-2");

    expect(profile.cardsPerPage).toBe(4);
    expect(profile.pageRows).toBe(2);
    expect(profile.pageColumns).toBe(2);
    expect(profile.advanceBy).toBe(1);
  });

  it("uses one-card step for one-row mode", () => {
    const profile = getFinalCardMessageLayoutProfile("carousel-1");

    expect(profile.cardsPerPage).toBe(3);
    expect(profile.advanceBy).toBe(1);
  });

  it("uses one-column step for two-row mode", () => {
    const profile = getFinalCardMessageLayoutProfile("carousel-2");

    expect(profile.cardsPerPage).toBe(6);
    expect(profile.pageRows).toBe(2);
    expect(profile.pageColumns).toBe(3);
    expect(profile.advanceBy).toBe(1);
  });

  it("uses dedicated limits for column and media mode", () => {
    const profile = getFinalCardMessageLayoutProfile("column-media");

    expect(profile.cardsPerPage).toBe(4);
    expect(profile.maxChars).toBe(280);
    expect(profile.pageVariant).toBe("column-media");
  });
});

describe("splitIntoMessagePages", () => {
  it("splits into plain non-overlapping chunks", () => {
    expect(splitIntoMessagePages([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]]);
  });
});
