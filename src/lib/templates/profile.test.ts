import { describe, expect, it } from "vitest";
import {
  defineTemplate,
  validateTemplateProfile,
  type TemplateProfile,
  type UniversalPhotoFrame
} from "@/lib/templates/profile";

const asset = (name: string) => ({
  src: `/templates/test/${name}.webp` as const,
  width: 1200,
  height: 800
});

const frame = (): UniversalPhotoFrame => ({
  aspectRatio: 1.4,
  aperture: { x: 0.08, y: 0.06, width: 0.84, height: 0.7 },
  captionArea: { x: 0.08, y: 0.78, width: 0.84, height: 0.16 },
  fit: "cover",
  caption: {
    maxChars: 45,
    maxLines: 2,
    align: "center",
    fontToken: "body",
    minScale: 0.72
  }
});

const validProfile = (): TemplateProfile => ({
  id: "test-template",
  family: "universal-v1",
  metadata: {
    name: "Тестовый шаблон",
    description: "Проверяет контракт universal-v1.",
    accent: "#e9652f",
    preview: asset("preview")
  },
  assets: {
    page: asset("page"),
    sections: { hero: asset("hero") },
    greetingCards: [asset("greeting")],
    qualityCards: [asset("quality")],
    quoteCards: [asset("quote")],
    photoFrames: {
      messagePortrait: frame(),
      messageLandscape: frame(),
      memory: frame()
    },
    footer: asset("footer"),
    decor: [
      {
        id: "hero-mark",
        asset: asset("mark"),
        anchor: "hero",
        rect: { x: 0.05, y: 0.05, width: 0.2, height: 0.2 },
        visibleOn: ["desktop", "mobile", "export"]
      }
    ]
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
    surfaces: { hero: "#ffffff" }
  },
  intro: {
    surface: "#ffffff",
    text: "#202124",
    accent: "#e9652f",
    mark: asset("intro-mark")
  },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: {
    networkBudget: 8_000_000,
    decodedMemoryBudget: 64_000_000
  },
  demo: { fixture: "full-card-default" }
});

describe("TemplateProfile", () => {
  it("принимает декларативный профиль universal-v1", () => {
    const profile = validProfile();
    expect(validateTemplateProfile(profile)).toEqual({ ok: true, profile, issues: [] });
    expect(defineTemplate(profile)).toBe(profile);
  });

  it("отклоняет фоторамку, выходящую за нормализованные границы", () => {
    const profile = validProfile();
    profile.assets.photoFrames.memory.aperture = { x: 0.8, y: 0, width: 0.4, height: 1 };

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.photoFrames.memory.aperture" }));
    }
  });

  it("фиксирует полный вывод подписи ровно до 45 символов", () => {
    const profile = validProfile() as unknown as {
      assets: { photoFrames: { memory: { caption: { maxChars: number } } } };
    };
    profile.assets.photoFrames.memory.caption.maxChars = 44;

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({
        path: "assets.photoFrames.memory.caption.maxChars"
      }));
    }
  });

  it("запрещает CSS и исполняемые функции в профиле", () => {
    const profile = { ...validProfile(), customCss: ".card {}", callback: () => null };
    const result = validateTemplateProfile(profile);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(["customCss", "callback"]));
    }
    expect(() => defineTemplate(profile as TemplateProfile)).toThrow("Невалидный TemplateProfile");
  });
});
