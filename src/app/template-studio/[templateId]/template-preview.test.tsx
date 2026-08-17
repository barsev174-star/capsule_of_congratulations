import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { createTemplateStudioDraft } from "@/lib/templates/studio";
import { school_scrapbookProfile } from "@/templates/school-scrapbook/profile";
import { TemplatePreview } from "./template-preview";

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
});

describe("TemplatePreview export fidelity", () => {
  it.each(["story", "post", "a4"] as const)(
    "uses the production asset transformation pipeline for %s",
    (format) => {
      const draft = createTemplateStudioDraft(school_scrapbookProfile);
      const { container } = render(
        <TemplatePreview
          draft={draft}
          fixtureId="public-full"
          scenario="grid-2"
          surface="public"
          viewport="desktop"
          format={format}
          photoCount={3}
          longName={false}
          textMode="default"
          optionalBlocks
          longCaptions={false}
        />
      );

      const pageUnderlay = container.querySelector("[data-export-page-underlay]");
      const closingUnderlay = container.querySelector(
        '[data-universal-export-block="closing"] [data-export-asset-underlay="horizontal-slice"]'
      );

      expect(pageUnderlay).toHaveAttribute(
        "src",
        expect.stringMatching(/^\/api\/template-export-asset\?src=.*&v=2&crop=.*&width=\d+&height=\d+$/)
      );
      expect(closingUnderlay).toHaveAttribute(
        "src",
        expect.stringMatching(/^\/api\/template-export-asset\?src=.*&v=2&width=\d+&height=\d+&slices=horizontal%3A0\.25$/)
      );
    }
  );
});
