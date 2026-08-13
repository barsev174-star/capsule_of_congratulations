import { describe, expect, it } from "vitest";
import { dispatchTemplateRenderer, requireTemplateRenderer } from "@/lib/templates/dispatcher";
import {
  createTemplateRegistry,
  templateRegistry,
  type UniversalTemplateRegistration
} from "@/lib/templates/registry";
import type { TemplateProfile } from "@/lib/templates/profile";

const universalRegistration = {
  id: "pilot-template",
  family: "universal-v1",
  profile: { id: "pilot-template", family: "universal-v1" } as TemplateProfile,
  catalog: {
    name: "Пилот",
    description: "Технический профиль",
    recommendedFor: ["personal"],
    accent: "#e9652f",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;

describe("template dispatcher", () => {
  it("направляет Paper и Route в неизменённый legacy renderer", () => {
    expect(dispatchTemplateRenderer("paper-birthday")).toMatchObject({
      kind: "legacy",
      registration: {
        renderer: "final-card-legacy",
        exportRenderer: "public-share-image-legacy"
      }
    });
    expect(dispatchTemplateRenderer("route-adventure")?.kind).toBe("legacy");
  });

  it("направляет новый профиль в universal-v1", () => {
    const registry = createTemplateRegistry([
      ...templateRegistry.entries,
      universalRegistration
    ]);

    expect(dispatchTemplateRenderer("pilot-template", registry)).toMatchObject({
      kind: "universal-v1",
      registration: { profile: universalRegistration.profile }
    });
  });

  it("не маскирует незарегистрированный ID", () => {
    expect(dispatchTemplateRenderer("unknown")).toBeNull();
    expect(() => requireTemplateRenderer("unknown")).toThrow("не зарегистрирован");
  });
});
