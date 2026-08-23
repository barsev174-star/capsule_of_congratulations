import {
  defineTemplate,
  defineTextCard,
  templateExportDecorFormats,
  validateTemplateProfile,
  type NormalizedRect,
  type TemplateAssetRef,
  type TemplateDecorLayer,
  type TemplateExportDecorFormat,
  type TemplateExportDecorVariant,
  type TemplateProfile,
  type TemplateProfileValidationIssue,
  type UniversalPhotoFrame,
  type UniversalTemplateBlockId
} from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

export const templateStudioViewports = ["desktop", "mobile"] as const;
export type TemplateStudioViewport = (typeof templateStudioViewports)[number];

export const templateStudioSurfaces = ["private", "public"] as const;
export type TemplateStudioSurface = (typeof templateStudioSurfaces)[number];

export const templateStudioFormats = ["web", "story", "post", "a4"] as const;
export type TemplateStudioFormat = (typeof templateStudioFormats)[number];

export type TemplateStudioVariantGeometry = {
  safeArea: NormalizedRect;
  container: NormalizedRect;
  padding: "xs" | "sm" | "md" | "lg" | "xl";
  background: {
    fit: "cover" | "contain";
    positionX: number;
    positionY: number;
    scale: number;
  };
};

export type TemplateStudioInspector = {
  selectedAssetPath: string;
  selectedBlock: UniversalTemplateBlockId;
  selectedFrame: "messagePortrait" | "messageLandscape" | "memory";
  gridStep: 0.01 | 0.025 | 0.05;
  variants: Record<TemplateStudioViewport | "export", TemplateStudioVariantGeometry>;
};

export type TemplateStudioDraft = {
  version: 1;
  profile: TemplateProfile;
  inspector: TemplateStudioInspector;
};

export type TemplateStudioDraftValidationResult = {
  ok: boolean;
  issues: TemplateProfileValidationIssue[];
};

const hashTemplateStudioBaseline = (draft: TemplateStudioDraft) => {
  const source = JSON.stringify(draft);
  let hash = 0x811c9dc5;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
};

export const getTemplateStudioStorageKey = (initialDraft: TemplateStudioDraft) =>
  `slovesto:template-studio:${initialDraft.profile.id}:v7:${hashTemplateStudioBaseline(initialDraft)}`;

const createExportDecorVariants = (
  rect: NormalizedRect,
  opacity = 1,
  rotation = 0
): Record<TemplateExportDecorFormat, TemplateExportDecorVariant> => Object.fromEntries(
  templateExportDecorFormats.map((format) => [format, { rect: structuredClone(rect), opacity, rotation }])
) as Record<TemplateExportDecorFormat, TemplateExportDecorVariant>;

export const createTemplateStudioDecorLayer = (
  profile: TemplateProfile,
  sourceAsset: TemplateAssetRef,
  anchor: TemplateDecorLayer["anchor"] = "templateRoot"
): TemplateDecorLayer => {
  const ids = new Set(profile.assets.decor.map((layer) => layer.id));
  let number = profile.assets.decor.length + 1;
  while (ids.has(`decor-${number}`)) number += 1;

  const rect = anchor === "templateRoot"
    ? { x: 0.76, y: 0.01, width: 0.22, height: 0.08 }
    : { x: 0.76, y: 0.04, width: 0.2, height: 0.28 };

  return {
    id: `decor-${number}`,
    asset: structuredClone(sourceAsset),
    anchor,
    rect,
    opacity: 1,
    rotation: 0,
    visibleOn: ["desktop", "mobile", "export"],
    exportVariants: createExportDecorVariants(rect)
  };
};

const asset = (src: `/${string}`, width: number, height: number): TemplateAssetRef => ({ src, width, height });

const photoFrame = (preset: "portrait-polaroid" | "landscape-polaroid"): UniversalPhotoFrame => ({
  preset,
  base: preset === "portrait-polaroid"
    ? asset("/templates/northern-light/photo-frame-portrait-base.webp", 802, 1122)
    : asset("/templates/northern-light/photo-frame-landscape-base.webp", 1122, 802),
  overlay: preset === "portrait-polaroid"
    ? asset("/templates/northern-light/photo-frame-portrait-overlay.webp", 802, 1122)
    : asset("/templates/northern-light/photo-frame-landscape-overlay.webp", 1122, 802),
  fit: "cover",
  caption: {
    maxChars: 45,
    maxLines: 2,
    align: "center",
    fontToken: "handwritten",
    minScale: 0.7
  }
});

export const createTemplateStudioProfile = (templateId: string): TemplateProfile => defineTemplate({
  id: templateId,
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: templateId === "universal-sandbox" ? "Технический макет" : `Макет ${templateId}`,
    description: "Development-only профиль для проверки универсальной семьи шаблонов.",
    accent: "#e9652f",
    preview: asset("/brand/og-default-1200x630.png", 1200, 630)
  },
  assets: {
    page: asset("/templates/scrapbook-clean/bg-paper-texture.png", 1536, 1024),
    sections: {
      summary: defineSectionUnderlay(asset("/templates/scrapbook-clean/torn-paper-summary.png", 1381, 766), "adaptive-frame", { opacity: 0.34 }),
      messages: defineSectionUnderlay(asset("/templates/scrapbook-clean/torn-paper-section.png", 1376, 768), "adaptive-frame", { opacity: 0.34 }),
      memories: defineSectionUnderlay(asset("/templates/scrapbook-clean/torn-paper-section1.png", 1376, 768), "adaptive-frame", { opacity: 0.34 }),
      closing: defineSectionUnderlay(asset("/templates/scrapbook-clean/torn-paper-summary.png", 1381, 766), "adaptive-frame", { opacity: 0.34 })
    },
    greetingCards: Array.from({ length: 4 }, () => defineSectionUnderlay(asset("/templates/scrapbook-clean/greeting-card-pink.png", 1402, 1122), "adaptive-frame")),
    qualityCards: [defineTextCard(asset("/templates/scrapbook-clean/quality-card-pink.png", 480, 258), "quality-pill")],
    quoteCards: [defineTextCard(asset("/templates/scrapbook-clean/quote-card-pink-v2.png", 1402, 1122), "quote-panel")],
    photoFrames: {
      messagePortrait: photoFrame("portrait-polaroid"),
      messageLandscape: photoFrame("landscape-polaroid"),
      memory: photoFrame("landscape-polaroid")
    },
    footer: asset("/templates/scrapbook-clean/footer-floral-cluster.png", 1536, 1024),
    decor: [
      {
        id: "hero-flower",
        asset: asset("/templates/scrapbook-clean/flower-1.png", 1254, 1254),
        anchor: "hero",
        rect: { x: 0.78, y: 0.02, width: 0.18, height: 0.18 },
        opacity: 0.82,
        rotation: 8,
        visibleOn: ["desktop", "mobile", "export"],
        exportVariants: createExportDecorVariants({ x: 0.78, y: 0.02, width: 0.18, height: 0.18 }, 0.82, 8)
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
    surfaces: {
      hero: "#ffffff",
      summary: "#f7f8fa",
      qualities: "#ffffff",
      messages: "#f7f8fa",
      memories: "#ffffff",
      quotes: "#f7f8fa",
      closing: "#ffffff"
    }
  },
  intro: {
    surface: "#ffffff",
    text: "#202124",
    accent: "#e9652f",
    mark: asset("/brand/logo-mark.svg", 112, 112)
  },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});

const variant = (
  safeArea: NormalizedRect,
  container: NormalizedRect,
  padding: TemplateStudioVariantGeometry["padding"]
): TemplateStudioVariantGeometry => ({
  safeArea,
  container,
  padding,
  background: { fit: "cover", positionX: 0.5, positionY: 0.5, scale: 1 }
});

export const createTemplateStudioDraft = (
  template: string | TemplateProfile = "universal-sandbox"
): TemplateStudioDraft => ({
  version: 1,
  profile: typeof template === "string" ? createTemplateStudioProfile(template) : structuredClone(template),
  inspector: {
    selectedAssetPath: "assets.page",
    selectedBlock: "hero",
    selectedFrame: "memory",
    gridStep: 0.025,
    variants: {
      desktop: variant(
        { x: 0.06, y: 0.04, width: 0.88, height: 0.92 },
        { x: 0, y: 0, width: 1, height: 1 },
        "lg"
      ),
      mobile: variant(
        { x: 0.05, y: 0.025, width: 0.9, height: 0.95 },
        { x: 0, y: 0, width: 1, height: 1 },
        "sm"
      ),
      export: variant(
        { x: 0.075, y: 0.055, width: 0.85, height: 0.89 },
        { x: 0, y: 0, width: 1, height: 1 },
        "md"
      )
    }
  }
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateNormalizedRect = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается нормализованный прямоугольник." });
    return;
  }
  for (const key of ["x", "y", "width", "height"] as const) {
    const coordinate = value[key];
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) {
      issues.push({ path: `${path}.${key}`, message: "Значение должно находиться в диапазоне 0…1." });
    }
  }
  if (typeof value.width === "number" && value.width <= 0) issues.push({ path: `${path}.width`, message: "Ширина должна быть больше нуля." });
  if (typeof value.height === "number" && value.height <= 0) issues.push({ path: `${path}.height`, message: "Высота должна быть больше нуля." });
  if (typeof value.x === "number" && typeof value.width === "number" && value.x + value.width > 1) issues.push({ path, message: "Область выходит за правую границу." });
  if (typeof value.y === "number" && typeof value.height === "number" && value.y + value.height > 1) issues.push({ path, message: "Область выходит за нижнюю границу." });
};

export const validateTemplateStudioDraft = (value: unknown): TemplateStudioDraftValidationResult => {
  const issues: TemplateProfileValidationIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ path: "", message: "Черновик должен быть объектом." }] };
  if (value.version !== 1) issues.push({ path: "version", message: "Поддерживается только версия черновика 1." });

  const profileResult = validateTemplateProfile(value.profile);
  if (!profileResult.ok) issues.push(...profileResult.issues.map((issue) => ({ ...issue, path: `profile.${issue.path}` })));

  if (!isRecord(value.inspector)) {
    issues.push({ path: "inspector", message: "Отсутствует конфигурация инспектора." });
    return { ok: false, issues };
  }
  if (![0.01, 0.025, 0.05].includes(Number(value.inspector.gridStep))) {
    issues.push({ path: "inspector.gridStep", message: "Недопустимый шаг сетки." });
  }
  if (!isRecord(value.inspector.variants)) {
    issues.push({ path: "inspector.variants", message: "Отсутствуют варианты геометрии." });
  } else {
    for (const viewport of ["desktop", "mobile", "export"] as const) {
      const entry = value.inspector.variants[viewport];
      const path = `inspector.variants.${viewport}`;
      if (!isRecord(entry)) {
        issues.push({ path, message: "Отсутствует вариант геометрии." });
        continue;
      }
      validateNormalizedRect(entry.safeArea, `${path}.safeArea`, issues);
      validateNormalizedRect(entry.container, `${path}.container`, issues);
      if (!["xs", "sm", "md", "lg", "xl"].includes(String(entry.padding))) issues.push({ path: `${path}.padding`, message: "Недопустимый токен отступа." });
      if (!isRecord(entry.background)) {
        issues.push({ path: `${path}.background`, message: "Отсутствуют настройки подложки." });
      } else {
        if (!["cover", "contain"].includes(String(entry.background.fit))) issues.push({ path: `${path}.background.fit`, message: "Допустимы cover или contain." });
        for (const key of ["positionX", "positionY"] as const) {
          const coordinate = entry.background[key];
          if (typeof coordinate !== "number" || coordinate < 0 || coordinate > 1) issues.push({ path: `${path}.background.${key}`, message: "Позиция должна находиться в диапазоне 0…1." });
        }
        if (typeof entry.background.scale !== "number" || entry.background.scale < 0.5 || entry.background.scale > 2) issues.push({ path: `${path}.background.scale`, message: "Масштаб должен находиться в диапазоне 0.5…2." });
      }
    }
  }

  return { ok: issues.length === 0, issues };
};

export type TemplateStudioImportResult =
  | { ok: true; draft: TemplateStudioDraft }
  | { ok: false; issues: TemplateProfileValidationIssue[] };

export const parseTemplateStudioImport = (
  source: string,
  currentDraft: TemplateStudioDraft
): TemplateStudioImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return { ok: false, issues: [{ path: "", message: "JSON не удалось прочитать." }] };
  }

  const candidate = isRecord(parsed) && parsed.family === "universal-v1"
    ? { ...currentDraft, profile: parsed }
    : parsed;
  const validation = validateTemplateStudioDraft(candidate);
  if (!validation.ok) return { ok: false, issues: validation.issues };
  return { ok: true, draft: candidate as TemplateStudioDraft };
};

export type TemplateStudioAssetEntry = {
  path: string;
  label: string;
  asset: TemplateAssetRef;
};

export const listTemplateProfileAssets = (profile: TemplateProfile): TemplateStudioAssetEntry[] => {
  const entries: TemplateStudioAssetEntry[] = [];
  const push = (path: string, label: string, value: TemplateAssetRef | undefined) => {
    if (value) entries.push({ path, label, asset: value });
  };

  push("metadata.preview", "Превью каталога", profile.metadata.preview);
  push("assets.page", "Фон страницы", profile.assets.page);
  Object.entries(profile.assets.sections).forEach(([block, value]) => {
    push(`assets.sections.${block}.asset`, `Подложка: ${block}`, value.asset);
    push(`assets.sections.${block}.mobileAsset`, `Mobile-подложка: ${block}`, value.mobileAsset);
  });
  profile.assets.greetingCards.forEach((value, index) => push(`assets.greetingCards.${index}.asset`, `Подложка поздравления ${index + 1}`, value.asset));
  profile.assets.qualityCards.forEach((value, index) => push(`assets.qualityCards.${index}.asset`, `Карточка качества ${index + 1}`, value.asset));
  profile.assets.exportQualityCards?.forEach((value, index) => push(`assets.exportQualityCards.${index}.asset`, `Карточка качества для экспорта ${index + 1}`, value.asset));
  profile.assets.quoteCards.forEach((value, index) => push(`assets.quoteCards.${index}.asset`, `Карточка фразы ${index + 1}`, value.asset));
  Object.entries(profile.assets.photoFrames).forEach(([frameId, frame]) => {
    push(`assets.photoFrames.${frameId}.base`, `Фоторамка ${frameId}: основа`, frame.base);
    push(`assets.photoFrames.${frameId}.overlay`, `Фоторамка ${frameId}: верхний слой`, frame.overlay);
  });
  push("assets.footer", "Подложка подвала", profile.assets.footer);
  profile.assets.decor.forEach((layer, index) => push(`assets.decor.${index}.asset`, `Декор: ${layer.id}`, layer.asset));
  push("intro.mark", "Знак заставки", profile.intro.mark);
  push("intro.pattern", "Паттерн заставки", profile.intro.pattern);
  profile.intro.decor?.forEach((asset, index) => push(`intro.decor.${index}`, `Декор заставки ${index + 1}`, asset));
  return entries;
};

export const replaceTemplateProfileAsset = (
  profile: TemplateProfile,
  path: string,
  assetValue: TemplateAssetRef
): TemplateProfile => {
  const clone = structuredClone(profile);
  const segments = path.split(".");
  let target: Record<string, unknown> | unknown[] = clone as unknown as Record<string, unknown>;
  for (let index = 0; index < segments.length - 1; index += 1) {
    target = (target as Record<string, unknown>)[segments[index]] as Record<string, unknown> | unknown[];
  }
  (target as Record<string, unknown>)[segments.at(-1) as string] = assetValue;
  return clone;
};
