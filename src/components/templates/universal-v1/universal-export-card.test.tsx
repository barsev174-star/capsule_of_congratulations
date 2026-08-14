import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { UniversalTemplateExportCard, universalExportFormats } from "./universal-export-card";

const profile = createTemplateStudioProfile("universal-export-test");
const minimumPrimaryPhotoWidth = { story: 560, post: 540, a4: 600 } as const;
const minimumSidePhotoWidth = { story: 350, post: 370, a4: 370 } as const;
const qualityFontSize = { story: 27, post: 23, a4: 25 } as const;
const quoteFontSize = { story: 25, post: 20, a4: 22 } as const;
const minimumRecipientNameFontSize = { story: 81, post: 61, a4: 73 } as const;
const closingHeight = { story: 289, post: 216, a4: 268 } as const;

describe("UniversalTemplateExportCard", () => {
  it.each(Object.keys(universalExportFormats) as Array<keyof typeof universalExportFormats>)(
    "renders the canonical public composition for %s",
    (format) => {
      const model = buildUniversalFixtureViewModel("public-full", {
        templateId: profile.id,
        photoCount: 3
      });
      const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format={format} />);
      const root = container.querySelector(`[data-export-format="${format}"]`);

      expect(root).toBeInTheDocument();
      expect((root?.querySelector(`img[src="${profile.assets.page?.src}"]`) as HTMLImageElement).style.opacity).toBe("");
      expect(root?.querySelector('[data-export-memories-layout="feature-stack"]')).toBeInTheDocument();
      expect(root?.querySelector("[data-export-photo-row]")?.children).toHaveLength(2);
      expect(root?.querySelectorAll("[data-export-photo]")).toHaveLength(universalExportFormats[format].photoCount);
      expect(root?.querySelector("[data-export-primary-column] [data-export-photo]")).toBeInTheDocument();
      expect(root?.querySelectorAll("[data-export-side-column] [data-export-photo]")).toHaveLength(universalExportFormats[format].photoCount - 1);
      expect(root?.querySelectorAll("[data-export-photo-rotation='0']")).toHaveLength(0);
      const primaryPhoto = root?.querySelector("[data-export-primary-column] [data-export-photo]") as HTMLElement;
      const sidePhoto = root?.querySelector("[data-export-side-column] [data-export-photo]") as HTMLElement;
      expect(Number.parseFloat(primaryPhoto.style.width)).toBeGreaterThanOrEqual(minimumPrimaryPhotoWidth[format]);
      expect(Number.parseFloat(sidePhoto.style.width)).toBeGreaterThanOrEqual(minimumSidePhotoWidth[format]);
      const captionFonts = Array.from(root?.querySelectorAll<HTMLElement>('[data-text-preset="photo-caption"]') ?? [])
        .map((caption) => Number.parseFloat(caption.style.fontSize));
      expect(captionFonts[0]).toBeGreaterThanOrEqual(format === "post" ? 25 : 26.5);
      expect(Math.min(...captionFonts.slice(1))).toBeGreaterThanOrEqual(19.5);
      expect(root?.querySelector(format === "post"
        ? "[data-export-side-column] [data-export-moments-heading]"
        : "[data-export-primary-column] [data-export-moments-heading]"
      )).toBeInTheDocument();
      const qualityRows = root?.querySelectorAll("[data-export-quality-row]");
      expect(qualityRows).toHaveLength(3);
      expect(Array.from(qualityRows ?? []).map((row) => row.children.length)).toEqual([2, 2, 1]);
      expect((root?.querySelector('[data-text-preset="quality-card"]') as HTMLElement).style.fontSize).toBe(`${qualityFontSize[format]}px`);
      expect(root?.querySelectorAll('[data-export-quality-card] [data-export-asset-underlay="nine-slice"]')).toHaveLength(5);
      expect(root?.querySelectorAll('[data-export-quality-card] [data-export-asset-underlay="nine-slice"] > svg')).toHaveLength(45);
      const recipientName = root?.querySelector('[data-text-preset="recipient-name"] strong') as HTMLElement;
      expect(Number.parseFloat(recipientName.style.fontSize)).toBeGreaterThanOrEqual(minimumRecipientNameFontSize[format]);
      expect(root?.querySelector('[data-universal-export-block="closing"]')).toHaveStyle({ height: `${closingHeight[format]}px` });
      expect(root?.querySelector('[data-underlay-preset="adaptive-frame"]')?.querySelectorAll(":scope > svg")).toHaveLength(9);
      for (const block of ["hero", "qualities", "quotes"]) {
        const bareSection = root?.querySelector(`[data-universal-export-block="${block}"]`);
        expect(bareSection).toHaveAttribute("data-section-presentation", "bare");
        expect(bareSection?.querySelector("[data-underlay-preset]")).not.toBeInTheDocument();
      }
      expect(root).not.toHaveTextContent("Пять особенных качеств");
      expect(root).not.toHaveTextContent("Выбор получателя");
      expect(root).toHaveTextContent("Фото, которыми хочется поделиться");
      expect(root).toHaveTextContent("Особенно тёплые слова");
      expect(root).toHaveTextContent("Место, где слова становятся подарком");
      const quoteFonts = Array.from(root?.querySelectorAll<HTMLElement>('[data-text-preset="quote-card"]') ?? [])
        .map((quote) => Number.parseFloat(quote.style.fontSize));
      expect([...new Set(quoteFonts)]).toEqual([quoteFontSize[format]]);
      expect(root?.querySelectorAll('[data-export-quote-card] [data-export-asset-underlay="nine-slice"]')).toHaveLength(
        format === "post" ? 3 : 0
      );
      if (format === "post") {
        const quoteWidths = Array.from(root?.querySelectorAll<HTMLElement>("[data-export-quote-card]") ?? [])
          .map((card) => Number.parseFloat(card.style.width));
        expect(quoteWidths[0]).toBeLessThan(320);
        expect([...new Set(quoteWidths)]).toHaveLength(1);
      }
      const closingUnderlay = root?.querySelector('[data-universal-export-block="closing"] [data-export-asset-underlay="horizontal-slice"]');
      expect(closingUnderlay).toBeInTheDocument();
      expect(closingUnderlay?.querySelectorAll(":scope > svg")).toHaveLength(3);
      expect(root?.querySelectorAll('[data-universal-export-block="quotes"] [data-safe-text]')).toHaveLength(
        format === "story" ? 2 : 3
      );
      expect(root?.querySelector('[data-universal-export-block="summary"]')).not.toBeInTheDocument();
      expect(root?.querySelector('[data-universal-export-block="messages"]')).not.toBeInTheDocument();
    }
  );

  it.each([0, 1, 2] as const)("keeps moments independent from a %s-photo greeting layout", (photoCount) => {
    const model = buildUniversalFixtureViewModel("public-full", {
      templateId: profile.id,
      photoCount
    });
    const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format="story" />);

    expect(container.querySelector('[data-universal-export-block="memories"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-export-photo]")).toHaveLength(3);
  });

  it("reuses normalized crop, profile assets and full boundary text", () => {
    const model = buildUniversalFixtureViewModel("photo-crop-stress", {
      templateId: profile.id,
      photoCount: 3,
      longName: true,
      longCaptions: true,
      textMode: "limit"
    });
    const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format="a4" />);
    const image = container.querySelector("[data-export-photo-image]") as HTMLImageElement;
    const firstPhoto = model.memoryPhotos[0];

    expect(image.style.objectPosition).toBe(`${firstPhoto.crop.x * 100}% ${firstPhoto.crop.y * 100}%`);
    expect(image.style.transform).toBe(`scale(${firstPhoto.crop.zoom})`);
    expect(container.innerHTML).toContain(profile.assets.page?.src);
    expect(container.innerHTML).toContain(profile.assets.decor[0]?.asset.src);
    expect(container).toHaveTextContent(model.recipientName);
    expect(container).toHaveTextContent(firstPhoto.caption);
    expect(firstPhoto.caption).toHaveLength(45);
  });
});
