import { describe, expect, it } from "vitest";
import {
  defineTemplate,
  defineTextCard,
  validateTemplateProfile,
  type TemplateProfile,
  type UniversalPhotoFrame
} from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (name: string) => ({
  src: `/templates/test/${name}.webp` as const,
  width: 1200,
  height: 800
});

const frame = (): UniversalPhotoFrame => ({
  preset: "landscape-polaroid",
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
  layoutPreset: "route-v1",
  metadata: {
    name: "Тестовый шаблон",
    description: "Проверяет контракт universal-v1.",
    accent: "#e9652f",
    preview: asset("preview")
  },
  assets: {
    page: asset("page"),
    sections: { hero: defineSectionUnderlay(asset("hero"), "adaptive-frame") },
    greetingCards: Array.from({ length: 4 }, (_, index) => defineSectionUnderlay(asset(`greeting-${index + 1}`), "adaptive-frame")),
    qualityCards: [defineTextCard({ ...asset("quality"), width: 480, height: 258 }, "quality-pill")],
    quoteCards: [defineTextCard({ ...asset("quote"), width: 1402, height: 1122 }, "quote-panel")],
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

  it("принимает только декларативные motion-профили calm и playful", () => {
    const profile = validProfile();
    profile.motion = { preset: "playful", revealSections: true, photoViewer: true };
    expect(validateTemplateProfile(profile)).toEqual({ ok: true, profile, issues: [] });

    profile.motion = { preset: "energetic", revealSections: true, photoViewer: true } as never;
    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "motion.preset" }));
    }
  });

  it("разрешает anchored-декору частично выходить за границы блока", () => {
    const profile = validProfile();
    profile.assets.decor[0].rect = { x: -0.1, y: 0.05, width: 0.25, height: 0.2 };

    expect(validateTemplateProfile(profile)).toEqual({ ok: true, profile, issues: [] });
  });

  it("отклоняет повторяющиеся ID и неизвестные режимы видимости декора", () => {
    const profile = validProfile();
    profile.assets.decor = [
      profile.assets.decor[0],
      { ...profile.assets.decor[0], visibleOn: ["desktop", "tablet"] as never }
    ];

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.decor.1.id" }));
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.decor.1.visibleOn" }));
    }
  });

  it("отклоняет неизвестный режим подложки блока", () => {
    const profile = validProfile() as unknown as {
      assets: { sections: { hero: { preset: string } } };
    };
    profile.assets.sections.hero.preset = "manual-pixels";

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.sections.hero.preset" }));
    }
  });

  it("отклоняет неизвестный геометрический preset фоторамки", () => {
    const profile = validProfile() as unknown as { assets: { photoFrames: { memory: { preset: string } } } };
    profile.assets.photoFrames.memory.preset = "manual-pixels";

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.photoFrames.memory.preset" }));
    }
  });

  it("отклоняет размер ассета, не совпадающий с preset-ом фоторамки", () => {
    const profile = validProfile();
    profile.assets.photoFrames.memory.base = asset("wrong-frame-size");

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.photoFrames.memory.base" }));
    }
  });

  it("отклоняет неизвестный preset текстовой плашки", () => {
    const profile = validProfile() as unknown as { assets: { quoteCards: Array<{ preset: string }> } };
    profile.assets.quoteCards[0].preset = "manual-text-area";

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.quoteCards.0.preset" }));
    }
  });

  it("принимает только полный цикл из четырёх подложек поздравлений", () => {
    const profile = validProfile() as unknown as { assets: { greetingCards: Array<TemplateProfile["assets"]["greetingCards"][number]> } };
    profile.assets.greetingCards = profile.assets.greetingCards.slice(0, 3);

    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.greetingCards" }));
    }
  });

  it("принимает только полный набор из пяти экспортных карточек качеств", () => {
    const profile = validProfile();
    profile.assets.exportQualityCards = Array.from({ length: 5 }, (_, index) => defineTextCard({
      src: `/templates/test/quality-export-${index + 1}.webp`,
      width: 720,
      height: 180
    }, "quality-pill-export"));
    expect(validateTemplateProfile(profile)).toEqual({ ok: true, profile, issues: [] });

    profile.assets.exportQualityCards = profile.assets.exportQualityCards.slice(0, 4);
    const result = validateTemplateProfile(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toContainEqual(expect.objectContaining({ path: "assets.exportQualityCards" }));
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
