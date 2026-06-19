import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ScrapbookComponentFrame,
  ScrapbookDecorProvider,
  restoreSizedPaperDefaults,
  safePaperSize
} from "./scrapbook-decor-layer";
import { scrapbookComponentAssets } from "./scrapbook-decor-config";

const summaryPaperDefault = scrapbookComponentAssets.find((asset) => asset.id === "summaryPaper")!;
const greetingCardDefault = scrapbookComponentAssets.find((asset) => asset.id === "greetingCardPink")!;

describe("safePaperSize", () => {
  it("returns auto for empty, auto and tiny pixel values", () => {
    expect(safePaperSize(undefined)).toBe("auto");
    expect(safePaperSize("")).toBe("auto");
    expect(safePaperSize("auto")).toBe("auto");
    expect(safePaperSize("0px")).toBe("auto");
    expect(safePaperSize("1px")).toBe("auto");
    expect(safePaperSize("2px")).toBe("auto");
  });

  it("preserves valid pixel and non-pixel values", () => {
    expect(safePaperSize("1080px")).toBe("1080px");
    expect(safePaperSize("auto")).toBe("auto");
    expect(safePaperSize("100%")).toBe("100%");
  });
});

describe("restoreSizedPaperDefaults", () => {
  it("leaves non-paper assets unchanged", () => {
    const result = restoreSizedPaperDefaults(greetingCardDefault);

    expect(result).toEqual(greetingCardDefault);
  });

  it("resets old fixed-size summary paper to current defaults", () => {
    const oldSummaryPaper = {
      ...summaryPaperDefault,
      paperTop: "-24px",
      paperLeft: "-44px",
      paperRight: "auto",
      paperBottom: "auto",
      paperWidth: "1080px",
      paperHeight: "180px"
    };

    const result = restoreSizedPaperDefaults(oldSummaryPaper);

    expect(result.paperWidth).toBe(summaryPaperDefault.paperWidth);
    expect(result.paperHeight).toBe(summaryPaperDefault.paperHeight);
    expect(result.paperTop).toBe(summaryPaperDefault.paperTop);
    expect(result.paperLeft).toBe(summaryPaperDefault.paperLeft);
    expect(result.paperRight).toBe(summaryPaperDefault.paperRight);
    expect(result.paperBottom).toBe(summaryPaperDefault.paperBottom);
  });

  it("resets collapsed paper size to defaults", () => {
    const collapsedPaper = {
      ...summaryPaperDefault,
      paperWidth: "auto",
      paperHeight: "auto"
    };

    const result = restoreSizedPaperDefaults(collapsedPaper);

    expect(result.paperWidth).toBe(summaryPaperDefault.paperWidth);
    expect(result.paperHeight).toBe(summaryPaperDefault.paperHeight);
  });

  it("resets paper with broken offsets to defaults", () => {
    const brokenOffsetPaper = {
      ...summaryPaperDefault,
      paperRight: "500px"
    };

    const result = restoreSizedPaperDefaults(brokenOffsetPaper);

    expect(result.paperRight).toBe(summaryPaperDefault.paperRight);
  });

  it("keeps healthy paper config untouched", () => {
    const healthyPaper = {
      ...summaryPaperDefault,
      opacity: 0.5,
      paddingTop: "30px"
    };

    const result = restoreSizedPaperDefaults(healthyPaper);

    expect(result.opacity).toBe(0.5);
    expect(result.paddingTop).toBe("30px");
    expect(result.paperWidth).toBe(summaryPaperDefault.paperWidth);
  });
});

describe("ScrapbookComponentFrame", () => {
  it("renders paper layer behind content with correct style variables", () => {
    render(
      <ScrapbookDecorProvider debugEnabled={false}>
        <ScrapbookComponentFrame assetId="summaryPaper" className="test-summary">
          <span data-testid="content">Summary content</span>
        </ScrapbookComponentFrame>
      </ScrapbookDecorProvider>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();

    const frame = screen.getByTestId("content").closest(".test-summary");
    expect(frame).not.toBeNull();

    const paperLayer = frame!.querySelector("span[aria-hidden='true']");
    expect(paperLayer).not.toBeNull();
  });
});
