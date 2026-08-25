import { describe, expect, it } from "vitest";

import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";

import { team_editorialProfile } from "./profile";
import { team_editorialRegistration } from "./registration";

describe("team-editorial product template", () => {
  it("is released through the shared universal renderer", () => {
    expect(validateTemplateProfile(team_editorialProfile).ok).toBe(true);
    expect(validateTemplateStudioDraft(createTemplateStudioDraft(team_editorialProfile))).toEqual({ ok: true, issues: [] });
    expect(dispatchTemplateRenderer("team-editorial")?.kind).toBe("universal-v1");
    expect(team_editorialRegistration.catalog.availability).toBe("product");
  });

  it("keeps the editorial palette and automatic surface contract declarative", () => {
    expect(team_editorialProfile.layoutPreset).toBe("route-v1");
    expect(team_editorialProfile.colors).toMatchObject({
      page: "#f6f1e8",
      text: "#14283b",
      accent: "#2f6f70",
      occasion: "#c8643f",
      action: "#2f6f70",
      sections: { memories: { text: "#fffaf2", muted: "#d8e5e1" } }
    });
    expect(team_editorialProfile.copy?.messagesTitle).toBe("Поздравления");
    expect(team_editorialProfile.metadata.name).toBe("Вместе");
    expect(team_editorialProfile.assets.photoFrames.memory.preset).toBe("landscape-shadow-frame-feature");
    expect(team_editorialProfile.assets.photoFrames.memory.caption).toMatchObject({ fontToken: "body", fontStyle: "italic", fontScale: 1.05, minScale: 0.76 });
    expect(team_editorialProfile.assets.sections.summary?.slices).toEqual({ top: 0.38, right: 0.16, bottom: 0.4, left: 0.12 });
    expect(team_editorialProfile.assets.greetingCards.every(({ slices }) => slices?.top === 0.34)).toBe(true);
    expect(team_editorialProfile.assets.greetingCards).toHaveLength(4);
    expect(team_editorialProfile.assets.qualityCards).toHaveLength(5);
    expect(team_editorialProfile.assets.exportQualityCards).toHaveLength(5);
    expect(team_editorialProfile.assets.quoteCards).toHaveLength(3);
    expect(team_editorialProfile.assets.exportQuoteCards).toHaveLength(3);
    expect(team_editorialProfile.assets.exportQuoteCards?.[0]?.asset.src).toContain("quote-card-1-export-v3.webp");
    const decorById = Object.fromEntries(team_editorialProfile.assets.decor.map((layer) => [layer.id, layer]));
    expect(decorById).toMatchObject({
      "hero-left-editorial-desktop": {
        rect: { x: -0.055, y: 0.015, width: 0.34, height: 0.98 }, rotation: -2, opacity: 0.99, visibleOn: ["desktop"]
      },
      "hero-right-editorial-desktop": {
        rect: { x: 0.64, y: 0.085, width: 0.515, height: 1 }, rotation: 21, opacity: 0.98, visibleOn: ["desktop"]
      },
      "hero-left-editorial-export": {
        rect: { x: -0.04, y: 0.02, width: 0.32, height: 0.98 }, rotation: -2, opacity: 0.99, visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: -0.04, y: 0.02, width: 0.32, height: 0.98 }, rotation: -2, opacity: 0.99 },
          post: { rect: { x: -0.05, y: 0.08, width: 0.29, height: 1.45 }, rotation: -7, opacity: 0.99 },
          a4: { rect: { x: -0.045, y: 0.06, width: 0.3, height: 1.35 }, rotation: -2, opacity: 0.99 }
        }
      },
      "hero-right-editorial-export": {
        rect: { x: 0.72, y: 0.04, width: 0.38, height: 0.98 }, rotation: 2, opacity: 0.98, visibleOn: ["export"],
        exportVariants: {
          story: { rect: { x: 0.72, y: 0.04, width: 0.38, height: 1.13 }, rotation: 29, opacity: 0.98 },
          post: { rect: { x: 0.7, y: 0.1, width: 0.41, height: 1.595 }, rotation: 24, opacity: 0.98 },
          a4: { rect: { x: 0.71, y: 0.08, width: 0.38, height: 1.465 }, rotation: 37, opacity: 0.98 }
        }
      },
      "hero-left-editorial-mobile": {
        rect: { x: 0, y: 0.53, width: 0.215, height: 0.655 }, rotation: -13, opacity: 0.96, visibleOn: []
      },
      "hero-right-editorial-mobile": {
        rect: { x: 0.785, y: -0.07, width: 0.29, height: 0.43 }, rotation: 29, opacity: 0.95, visibleOn: ["mobile"]
      }
    });
    const exportDecor = team_editorialProfile.assets.decor.filter(({ visibleOn }) => visibleOn?.includes("export"));
    expect(exportDecor.every(({ exportVariants }) => Boolean(exportVariants?.story && exportVariants.post && exportVariants.a4))).toBe(true);
  });
});
