import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { UniversalTemplateExportCard, universalExportFormats } from "./universal-export-card";

const profile = createTemplateStudioProfile("universal-export-test");

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
      expect(root?.querySelector('[data-export-memories-layout="route-strip"]')).toBeInTheDocument();
      expect(root?.querySelector("[data-export-photo-row]")?.children).toHaveLength(3);
      expect(root?.querySelectorAll("[data-export-photo]")).toHaveLength(3);
      expect(root?.querySelector('[data-underlay-preset="adaptive-frame"]')?.querySelectorAll(":scope > svg")).toHaveLength(9);
      expect(root?.querySelectorAll('[data-universal-export-block="quotes"] [data-safe-text]')).toHaveLength(
        format === "a4" ? 3 : 2
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
    expect(container.innerHTML).toContain(profile.assets.sections.hero?.asset.src);
    expect(container).toHaveTextContent(model.recipientName);
    expect(container).toHaveTextContent(firstPhoto.caption);
    expect(firstPhoto.caption).toHaveLength(45);
  });
});
