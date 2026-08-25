import { describe, expect, it } from "vitest";
import { defineTemplate, type TemplateProfile } from "@/lib/templates/profile";
import {
  catalogTemplateRegistrations,
  createTemplateRegistry,
  defineUniversalTemplateRegistration,
  isProductTemplateId,
  isRegisteredTemplateId,
  studioTemplateRegistrations,
  templateRegistry,
  type LegacyTemplateRegistration
} from "@/lib/templates/registry";

const universalProfile = defineTemplate({
  id: "pilot-template",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: "Пилот",
    description: "Технический профиль",
    accent: "#e9652f",
    preview: { src: "/templates/pilot/preview.webp", width: 400, height: 300 }
  },
  assets: {
    sections: {},
    greetingCards: [],
    qualityCards: [],
    quoteCards: [],
    photoFrames: {
      messagePortrait: {
        preset: "portrait-polaroid",
        fit: "cover",
        caption: { maxChars: 45, maxLines: 2, align: "center", fontToken: "body", minScale: 0.7 }
      },
      messageLandscape: {
        preset: "landscape-polaroid",
        fit: "cover",
        caption: { maxChars: 45, maxLines: 2, align: "center", fontToken: "body", minScale: 0.7 }
      },
      memory: {
        preset: "landscape-polaroid",
        fit: "cover",
        caption: { maxChars: 45, maxLines: 2, align: "center", fontToken: "body", minScale: 0.7 }
      }
    },
    decor: []
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "Inter", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#f7f8fa",
    text: "#202124",
    muted: "#5f6368",
    accent: "#e9652f",
    surface: "#ffffff",
    surfaces: {}
  },
  intro: { surface: "#ffffff", text: "#202124", accent: "#e9652f" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 1_000_000, decodedMemoryBudget: 8_000_000 },
  demo: { fixture: "full-card-default" }
} satisfies TemplateProfile);

const catalog = {
  name: "Пилот",
  description: "Технический профиль",
  recommendedFor: ["personal" as const],
  accent: "#e9652f",
  availability: "studio" as const
};

describe("template registry", () => {
  it("оставляет Paper и Route в legacy и добавляет продуктовый universal-шаблон", () => {
    expect(templateRegistry.get("paper-birthday")?.family).toBe("legacy");
    expect(templateRegistry.get("route-adventure")?.family).toBe("legacy");
    expect(catalogTemplateRegistrations.map((entry) => entry.id)).toEqual([
      "paper-birthday",
      "route-adventure",
      "school-scrapbook",
      "school-classic",
      "kindergarten-doodles"
    ]);
  });

  it("сохраняет распознавание скрытых legacy ID", () => {
    expect(isRegisteredTemplateId("warm-classic")).toBe(true);
    expect(isRegisteredTemplateId("paper-birthday")).toBe(true);
    expect(isRegisteredTemplateId("northern-light")).toBe(true);
    expect(isRegisteredTemplateId("daylight-proof")).toBe(true);
    expect(isProductTemplateId("northern-light")).toBe(false);
    expect(isProductTemplateId("daylight-proof")).toBe(false);
    expect(isProductTemplateId("route-adventure")).toBe(true);
    expect(isProductTemplateId("school-scrapbook")).toBe(true);
    expect(isProductTemplateId("school-classic")).toBe(true);
    expect(isProductTemplateId("kindergarten-doodles")).toBe(true);
    expect(isRegisteredTemplateId("unknown")).toBe(false);
  });

  it("показывает зарегистрированные universal-шаблоны в справочнике ателье", () => {
    expect(studioTemplateRegistrations.map((entry) => entry.id)).toEqual([
      "northern-light",
      "daylight-proof",
      "school-scrapbook",
      "school-classic",
      "kindergarten-doodles"
    ]);
  });

  it("регистрирует universal-v1 рядом с legacy", () => {
    const registration = defineUniversalTemplateRegistration(universalProfile, catalog);
    const registry = createTemplateRegistry([...templateRegistry.entries, registration]);

    expect(registry.get("pilot-template")).toEqual(registration);
    expect(registry.get("paper-birthday")?.family).toBe("legacy");
  });

  it("отклоняет повторный ID", () => {
    const paper = templateRegistry.get("paper-birthday") as LegacyTemplateRegistration;
    expect(() => createTemplateRegistry([paper, paper])).toThrow("зарегистрирован повторно");
  });
});
