import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { school_scrapbookProfile } from "@/templates/school-scrapbook/profile";
import { UniversalTemplateExportCard, universalExportFormats } from "./universal-export-card";

const profile = createTemplateStudioProfile("universal-export-test");
const minimumPrimaryPhotoWidth = { story: 560, post: 540, a4: 600 } as const;
const minimumSidePhotoWidth = { story: 350, post: 370, a4: 370 } as const;
const qualityFontSize = { story: 15, post: 12, a4: 13 } as const;
const dedicatedQualityFontSize = { story: 24, post: 20, a4: 22 } as const;
const dedicatedQualityWidth = { story: 280, post: 240, a4: 260 } as const;
const dedicatedClosingHeight = { story: 264, post: 188, a4: 231 } as const;
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
      model.publicPhotoCount = 6;
      const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format={format} />);
      const root = container.querySelector(`[data-export-format="${format}"]`);

      expect(root).toBeInTheDocument();
      expect(root?.querySelector('[data-export-counter="photos"]')).toHaveTextContent("6 фото в открытке");
      expect(root?.querySelector("[data-export-page-underlay]")).toHaveAttribute(
        "src",
        expect.stringContaining(`${profile.assets.page?.src}?crop=`)
      );
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
      expect(root?.querySelector('[data-export-quality-grid="2-1-2"]')).toBeInTheDocument();
      expect(Array.from(qualityRows ?? []).map((row) => row.children.length)).toEqual([2, 1, 2]);
      expect((root?.querySelector('[data-text-preset="quality-card"]') as HTMLElement).style.fontSize).toBe(`${qualityFontSize[format]}px`);
      expect(root?.querySelectorAll('[data-export-quality-card] [data-export-quality-asset]')).toHaveLength(5);
      for (const qualityCard of Array.from(root?.querySelectorAll<HTMLElement>("[data-export-quality-card]") ?? [])) {
        const qualityAsset = qualityCard.querySelector<HTMLElement>("[data-export-quality-asset]");
        expect(qualityAsset).toHaveStyle({ objectFit: "contain" });
        expect(Number.parseFloat(qualityCard.style.width) / Number.parseFloat(qualityCard.style.height)).toBeCloseTo(480 / 258, 4);
      }
      const recipientName = root?.querySelector('[data-text-preset="recipient-name"] > span') as HTMLElement;
      expect(Number.parseFloat(recipientName.style.fontSize)).toBeGreaterThanOrEqual(minimumRecipientNameFontSize[format]);
      expect(root?.querySelector('[data-universal-export-block="closing"]')).toHaveStyle({ height: `${closingHeight[format]}px` });
      expect(root?.querySelector('[data-export-asset-underlay="nine-slice"][data-export-raster-slice]')).toBeInTheDocument();
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
      expect(closingUnderlay).toHaveAttribute("data-export-raster-slice");
      expect(root?.querySelectorAll('[data-universal-export-block="quotes"] [data-safe-text]')).toHaveLength(
        format === "story" ? 2 : 3
      );
      expect(root?.querySelector('[data-universal-export-block="summary"]')).not.toBeInTheDocument();
      expect(root?.querySelector('[data-universal-export-block="messages"]')).not.toBeInTheDocument();
    }
  );

  it.each(["story", "post", "a4"] as const)("prefers proportional dedicated quality cards in the %s export", (format) => {
    const dedicatedProfile = structuredClone(profile);
    dedicatedProfile.assets.exportQualityCards = Array.from({ length: 5 }, (_, index) => ({
      asset: { src: `/templates/test/quality-export-${index + 1}.webp` as const, width: 720, height: 180 },
      preset: "quality-pill-export" as const
    }));
    const model = buildUniversalFixtureViewModel("public-full", { templateId: dedicatedProfile.id });
    const { container } = render(<UniversalTemplateExportCard profile={dedicatedProfile} model={model} format={format} />);
    const qualityCards = Array.from(container.querySelectorAll<HTMLElement>("[data-export-quality-card]"));

    expect(qualityCards).toHaveLength(5);
    expect(container.querySelector('[data-export-quality-asset]')).toHaveAttribute("src", "/templates/test/quality-export-1.webp");
    expect(Number.parseFloat(qualityCards[0].style.width) / Number.parseFloat(qualityCards[0].style.height)).toBeCloseTo(4, 4);
    expect(Number.parseFloat(qualityCards[0].style.width)).toBe(dedicatedQualityWidth[format]);
    expect(container.querySelector('[data-text-preset="quality-card"]')).toHaveStyle({ fontSize: `${dedicatedQualityFontSize[format]}px` });
    expect(container.querySelector('[data-universal-export-block="closing"]')).toHaveStyle({ height: `${dedicatedClosingHeight[format]}px` });
    const qualityRows = Array.from(container.querySelectorAll<HTMLElement>("[data-export-quality-row]"));
    expect(qualityRows.map((row) => row.children.length)).toEqual([2, 1, 2]);
    expect(Number.parseFloat(qualityRows[0].style.width)).toBe(dedicatedQualityWidth[format] * 3);
    expect(Number.parseFloat(qualityRows[1].style.width)).toBe(dedicatedQualityWidth[format]);
    expect(Number.parseFloat(qualityRows[2].style.width)).toBe(dedicatedQualityWidth[format] * 3);
    expect(container.querySelector('[data-export-quality-grid="2-1-2"]')).toHaveStyle({ alignItems: "center" });
  });

  it.each([0, 1, 2] as const)("keeps moments independent from a %s-photo greeting layout", (photoCount) => {
    const model = buildUniversalFixtureViewModel("public-full", {
      templateId: profile.id,
      photoCount
    });
    const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format="story" />);

    expect(container.querySelector('[data-universal-export-block="memories"]')).toBeInTheDocument();
    expect(container.querySelectorAll("[data-export-photo]")).toHaveLength(3);
  });

  it.each(["story", "post", "a4"] as const)("keeps the colorful school counters in the %s export", (format) => {
    const model = buildUniversalFixtureViewModel("public-full", { templateId: school_scrapbookProfile.id });
    model.publicPhotoCount = 3;
    const { container } = render(<UniversalTemplateExportCard profile={school_scrapbookProfile} model={model} format={format} />);

    expect(container.querySelector('[data-export-counter="congratulations"]')).toHaveStyle({
      color: "#1859bd",
      background: "#fff0a8",
      transform: "rotate(-1.5deg)"
    });
    expect(container.querySelector('[data-export-counter="photos"]')).toHaveStyle({
      color: "#0b7278",
      background: "#d9f3ef",
      transform: "rotate(1.5deg)"
    });
  });

  it.each(["story", "post", "a4"] as const)("keeps the school decor proportional in the %s export", (format) => {
    const model = buildUniversalFixtureViewModel("public-full", { templateId: school_scrapbookProfile.id });
    const { container } = render(<UniversalTemplateExportCard profile={school_scrapbookProfile} model={model} format={format} />);

    for (const layerId of [
      "hero-globe-cluster-export",
      "hero-backpack-cluster-export",
      "closing-student-doodle-export",
      "closing-student-girl-doodle-export"
    ]) {
      const layer = container.querySelector<HTMLElement>(`[data-decor-layer="${layerId}"]`);
      const sourceLayer = school_scrapbookProfile.assets.decor.find(({ id }) => id === layerId);
      expect(layer).toBeInTheDocument();
      expect(sourceLayer).toBeDefined();
      expect(Number.parseFloat(layer?.style.width ?? "0") / Number.parseFloat(layer?.style.height ?? "1"))
        .toBeCloseTo((sourceLayer?.asset.width ?? 1) / (sourceLayer?.asset.height ?? 1), 4);
    }

    expect(container.querySelector('[data-universal-export-block="closing"] [data-export-asset-underlay="horizontal-slice"]'))
      .toHaveAttribute("src", expect.stringContaining("horizontal%3A0.25"));
  });

  it("moves the school Story hero description onto an intentional second line", () => {
    const schoolProfile = structuredClone(profile);
    schoolProfile.id = "school-scrapbook";
    const model = buildUniversalFixtureViewModel("public-full", { templateId: schoolProfile.id });
    const { container } = render(<UniversalTemplateExportCard profile={schoolProfile} model={model} format="story" />);

    expect(container.querySelector("[data-export-hero-description]")).toHaveTextContent(
      "Тёплые слова, яркие моменты и пожелания специально для тебя."
    );
    expect(container.querySelector("[data-export-hero-description]")?.textContent).toContain("моменты\nи пожелания");
  });

  it.each(["story", "post", "a4"] as const)("puts a Russian patronymic on a dedicated line in the %s export", (format) => {
    const model = buildUniversalFixtureViewModel("public-full", { templateId: profile.id });
    model.recipientName = "Наталья Афанасьевна";
    const { container } = render(<UniversalTemplateExportCard profile={profile} model={model} format={format} />);
    const heading = container.querySelector('[data-text-preset="recipient-name"] > span') as HTMLElement;

    expect(heading.textContent).toBe("Наталья\nАфанасьевна");
  });

  it("preserves overflowing anchored decor in export", () => {
    const overflowProfile = structuredClone(profile);
    overflowProfile.assets.decor[0] = {
      ...overflowProfile.assets.decor[0],
      anchor: "closing",
      rect: { x: 0.9, y: 0.1, width: 0.2, height: 0.3 }
    };
    const model = buildUniversalFixtureViewModel("public-full", { templateId: profile.id });
    const { container } = render(<UniversalTemplateExportCard profile={overflowProfile} model={model} format="story" />);
    const closing = container.querySelector('[data-universal-export-block="closing"]');

    expect(closing).toHaveAttribute("data-decor-overflow", "visible");
    expect(closing?.querySelector("[data-export-raster-slice]")).toBeInTheDocument();
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
