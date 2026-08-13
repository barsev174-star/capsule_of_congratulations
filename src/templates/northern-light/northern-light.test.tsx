import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import {
  UniversalTemplateExportCard,
  universalExportFormats
} from "@/components/templates/universal-v1/universal-export-card";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";
import { northern_lightProfile } from "./profile";

describe("northern-light pilot template", () => {
  it("is valid, registered and opens in the studio with its real profile", () => {
    const dispatch = dispatchTemplateRenderer("northern-light");
    const draft = createTemplateStudioDraft(northern_lightProfile);

    expect(validateTemplateProfile(northern_lightProfile)).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatch?.kind).toBe("universal-v1");
    expect(dispatch?.registration.id).toBe("northern-light");
    expect(validateTemplateStudioDraft(draft)).toEqual({ ok: true, issues: [] });
    expect(draft.profile.metadata.preview.src).toBe("/templates/northern-light/preview.webp");
  });

  it("renders the same profile on private and public web surfaces", () => {
    const dispatch = dispatchTemplateRenderer("northern-light");
    if (!dispatch || dispatch.kind !== "universal-v1") throw new Error("Northern Light is not registered");
    const model = buildUniversalFixtureViewModel("public-full", {
      templateId: northern_lightProfile.id,
      photoCount: 3
    });
    const { container, rerender } = render(
      <TemplateCardRenderer dispatch={dispatch} model={model} surface="private" />
    );

    expect(container.querySelector('[data-template-id="northern-light"]')).toBeInTheDocument();
    expect((container.querySelector('[data-template-id="northern-light"] > span[aria-hidden="true"]') as HTMLElement).style.backgroundImage)
      .toContain("/templates/northern-light/page.webp");
    expect(container.querySelector('[data-universal-block="messages"]')).toBeInTheDocument();

    rerender(<TemplateCardRenderer dispatch={dispatch} model={model} surface="public" />);
    expect(container.querySelector('[data-universal-block="messages"]')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-universal-block="memories"] [data-photo-frame]')).toHaveLength(3);
  });

  it.each(Object.keys(universalExportFormats) as Array<keyof typeof universalExportFormats>)(
    "renders the pilot through the shared %s export renderer",
    (format) => {
      const model = buildUniversalFixtureViewModel("public-full", {
        templateId: northern_lightProfile.id,
        photoCount: 3
      });
      const { container } = render(
        <UniversalTemplateExportCard profile={northern_lightProfile} model={model} format={format} />
      );

      expect(container.querySelector(`[data-export-format="${format}"]`)).toBeInTheDocument();
      expect(container.querySelectorAll("[data-export-photo]")).toHaveLength(3);
      expect(container.innerHTML).toContain("/templates/northern-light/hero.webp");
    }
  );
});
