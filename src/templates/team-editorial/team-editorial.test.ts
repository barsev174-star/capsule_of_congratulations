import { describe, expect, it } from "vitest";

import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { createTemplateStudioDraft, validateTemplateStudioDraft } from "@/lib/templates/studio";

import { team_editorialProfile } from "./profile";
import { team_editorialRegistration } from "./registration";

describe("team-editorial studio template", () => {
  it("is registered only in the atelier and uses the shared universal renderer", () => {
    expect(validateTemplateProfile(team_editorialProfile).ok).toBe(true);
    expect(validateTemplateStudioDraft(createTemplateStudioDraft(team_editorialProfile))).toEqual({ ok: true, issues: [] });
    expect(dispatchTemplateRenderer("team-editorial")?.kind).toBe("universal-v1");
    expect(team_editorialRegistration.catalog.availability).toBe("studio");
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
    expect(team_editorialProfile.assets.photoFrames.memory.caption).toMatchObject({ fontToken: "body", fontStyle: "italic", fontScale: 1.18, minScale: 0.82 });
    expect(team_editorialProfile.assets.greetingCards).toHaveLength(4);
    expect(team_editorialProfile.assets.qualityCards).toHaveLength(5);
    expect(team_editorialProfile.assets.exportQualityCards).toHaveLength(5);
    expect(team_editorialProfile.assets.quoteCards).toHaveLength(3);
    const exportDecor = team_editorialProfile.assets.decor.filter(({ visibleOn }) => visibleOn?.includes("export"));
    expect(exportDecor.every(({ exportVariants }) => Boolean(exportVariants?.story && exportVariants.post && exportVariants.a4))).toBe(true);
  });
});
