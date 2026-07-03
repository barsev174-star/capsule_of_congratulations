import { afterEach, describe, expect, it } from "vitest";
import { getPublicationMode, isGiftPublished } from "@/lib/cards/status";

describe("card publication status", () => {
  const previousMode = process.env.PUBLICATION_MODE;

  afterEach(() => {
    if (previousMode === undefined) {
      delete process.env.PUBLICATION_MODE;
    } else {
      process.env.PUBLICATION_MODE = previousMode;
    }
  });

  it("uses free publication by default", () => {
    delete process.env.PUBLICATION_MODE;

    expect(getPublicationMode()).toBe("free");
  });

  it("opens an unpaid published card during free beta", () => {
    expect(isGiftPublished({ status: "published", paymentStatus: "unpaid" }, "free")).toBe(true);
  });

  it("does not open a draft during free beta", () => {
    expect(isGiftPublished({ status: "draft", paymentStatus: "unpaid" }, "free")).toBe(false);
  });

  it("requires payment when paid publication is enabled", () => {
    expect(isGiftPublished({ status: "published", paymentStatus: "unpaid" }, "paid")).toBe(false);
    expect(isGiftPublished({ status: "published", paymentStatus: "paid" }, "paid")).toBe(true);
  });
});
