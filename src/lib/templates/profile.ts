import { universalLayoutPresetIds, type UniversalLayoutPresetId } from "@/lib/templates/layout-presets";
import {
  getUniversalPhotoFramePreset,
  universalPhotoFramePresetIds,
  type UniversalPhotoFramePresetId
} from "@/lib/templates/photo-frame-presets";
import {
  universalSectionUnderlayPresetIds,
  type TemplateSectionUnderlay
} from "@/lib/templates/section-underlays";
import {
  getUniversalTextCardPreset,
  universalTextCardPresetIds,
  type UniversalTextCardPresetId
} from "@/lib/templates/text-card-presets";

export const UNIVERSAL_TEMPLATE_FAMILY = "universal-v1" as const;
export const UNIVERSAL_EXPORT_PROFILE = "universal-export-v1" as const;

export const universalTemplateBlockOrder = [
  "hero",
  "summary",
  "qualities",
  "messages",
  "memories",
  "quotes",
  "closing"
] as const;

export const universalPublicBlocks = ["hero", "qualities", "memories", "quotes"] as const;

export type UniversalTemplateBlockId = (typeof universalTemplateBlockOrder)[number];
export type UniversalPublicBlockId = (typeof universalPublicBlocks)[number];
export type UniversalTemplateFixtureId =
  | "full-card-default"
  | "text-stress"
  | "minimal"
  | "public-full"
  | "public-no-photos"
  | "photo-crop-stress";

export type TemplateAssetRef = {
  src: `/${string}`;
  width: number;
  height: number;
};

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateTextCard = {
  asset: TemplateAssetRef;
  preset: UniversalTextCardPresetId;
};

export const defineTextCard = (
  asset: TemplateAssetRef,
  preset: UniversalTextCardPresetId
): TemplateTextCard => ({ asset, preset });

export type UniversalPhotoFrame = {
  preset: UniversalPhotoFramePresetId;
  base?: TemplateAssetRef;
  overlay?: TemplateAssetRef;
  fit: "cover";
  caption: {
    maxChars: 45;
    maxLines: 2;
    align: "left" | "center" | "right";
    fontToken: "body" | "handwritten";
    minScale: number;
  };
};

export type TemplateFontToken = {
  family: string;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
};

export type TemplateDecorLayer = {
  id: string;
  asset: TemplateAssetRef;
  anchor: "templateRoot" | UniversalTemplateBlockId;
  rect: NormalizedRect;
  opacity?: number;
  rotation?: number;
  visibleOn?: ReadonlyArray<"desktop" | "mobile" | "export">;
};

export type TemplateProfile = {
  id: string;
  family: typeof UNIVERSAL_TEMPLATE_FAMILY;
  layoutPreset: UniversalLayoutPresetId;
  metadata: {
    name: string;
    description: string;
    accent: string;
    preview: TemplateAssetRef;
  };
  assets: {
    page?: TemplateAssetRef;
    sections: Partial<Record<UniversalTemplateBlockId, TemplateSectionUnderlay>>;
    greetingCards: readonly TemplateSectionUnderlay[];
    qualityCards: readonly TemplateTextCard[];
    quoteCards: readonly TemplateTextCard[];
    photoFrames: {
      messagePortrait: UniversalPhotoFrame;
      messageLandscape: UniversalPhotoFrame;
      memory: UniversalPhotoFrame;
    };
    footer?: TemplateAssetRef;
    decor: readonly TemplateDecorLayer[];
  };
  typography: {
    heading: TemplateFontToken;
    body: TemplateFontToken;
    handwritten: TemplateFontToken;
  };
  colors: {
    page: string;
    text: string;
    muted: string;
    accent: string;
    surface: string;
    surfaces: Partial<Record<UniversalTemplateBlockId, string>>;
  };
  intro: {
    surface: string;
    text: string;
    accent: string;
    mark?: TemplateAssetRef;
    pattern?: TemplateAssetRef;
  };
  public: {
    blocks: readonly UniversalPublicBlockId[];
  };
  export: {
    profile: typeof UNIVERSAL_EXPORT_PROFILE;
  };
  performance: {
    networkBudget: number;
    decodedMemoryBudget: number;
  };
  demo: {
    fixture: UniversalTemplateFixtureId;
  };
};

export type TemplateProfileValidationIssue = {
  path: string;
  message: string;
};

export type TemplateProfileValidationResult =
  | { ok: true; profile: TemplateProfile; issues: [] }
  | { ok: false; issues: TemplateProfileValidationIssue[] };

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const colorPattern = /^#[0-9a-f]{6}$/i;
const forbiddenKeyPattern = /(?:component|callback|selector|css|html)/i;
const fixtureIds = new Set<UniversalTemplateFixtureId>([
  "full-card-default",
  "text-stress",
  "minimal",
  "public-full",
  "public-no-photos",
  "photo-crop-stress"
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateDeclarativeValue = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[],
  seen = new Set<unknown>()
) => {
  if (typeof value === "function") {
    issues.push({ path, message: "Профиль не может содержать исполняемые функции." });
    return;
  }

  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  for (const [key, nested] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (forbiddenKeyPattern.test(key)) {
      issues.push({ path: nestedPath, message: "HTML, CSS, селекторы и компоненты не входят в декларативный профиль." });
    }
    validateDeclarativeValue(nested, nestedPath, issues, seen);
  }
};

const validateColor = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (typeof value !== "string" || !colorPattern.test(value)) {
    issues.push({ path, message: "Ожидается цвет в формате #RRGGBB." });
  }
};

const validateAsset = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[],
  optional = false
) => {
  if (value === undefined && optional) return;
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается ссылка на ассет." });
    return;
  }

  if (typeof value.src !== "string" || !value.src.startsWith("/") || value.src.startsWith("//")) {
    issues.push({ path: `${path}.src`, message: "Ассет должен использовать локальный абсолютный путь вида /templates/…." });
  }
  if (!Number.isInteger(value.width) || Number(value.width) <= 0) {
    issues.push({ path: `${path}.width`, message: "Ширина ассета должна быть положительным целым числом." });
  }
  if (!Number.isInteger(value.height) || Number(value.height) <= 0) {
    issues.push({ path: `${path}.height`, message: "Высота ассета должна быть положительным целым числом." });
  }
};

const validateRect = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается нормализованный прямоугольник." });
    return;
  }

  const keys = ["x", "y", "width", "height"] as const;
  for (const key of keys) {
    const coordinate = value[key];
    if (typeof coordinate !== "number" || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) {
      issues.push({ path: `${path}.${key}`, message: "Координата должна находиться в диапазоне 0…1." });
    }
  }

  if (typeof value.width === "number" && value.width <= 0) {
    issues.push({ path: `${path}.width`, message: "Ширина должна быть больше нуля." });
  }
  if (typeof value.height === "number" && value.height <= 0) {
    issues.push({ path: `${path}.height`, message: "Высота должна быть больше нуля." });
  }
  if (typeof value.x === "number" && typeof value.width === "number" && value.x + value.width > 1) {
    issues.push({ path, message: "Прямоугольник выходит за правую границу контейнера." });
  }
  if (typeof value.y === "number" && typeof value.height === "number" && value.y + value.height > 1) {
    issues.push({ path, message: "Прямоугольник выходит за нижнюю границу контейнера." });
  }
};

const validatePhotoFrame = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается профиль фоторамки." });
    return;
  }

  if (!universalPhotoFramePresetIds.includes(value.preset as never)) {
    issues.push({ path: `${path}.preset`, message: "Неизвестный preset фоторамки." });
    return;
  }
  const preset = getUniversalPhotoFramePreset(value.preset as UniversalPhotoFramePresetId);
  validateAsset(value.base, `${path}.base`, issues, true);
  validateAsset(value.overlay, `${path}.overlay`, issues, true);
  for (const key of ["base", "overlay"] as const) {
    const asset = value[key];
    if (isRecord(asset) && (asset.width !== preset.source.width || asset.height !== preset.source.height)) {
      issues.push({
        path: `${path}.${key}`,
        message: `Ассет preset-а ${preset.id} должен иметь размер ${preset.source.width} × ${preset.source.height}.`
      });
    }
  }
  if (value.fit !== "cover") {
    issues.push({ path: `${path}.fit`, message: "В universal-v1 поддерживается только fit=cover." });
  }

  if (!isRecord(value.caption)) {
    issues.push({ path: `${path}.caption`, message: "Ожидаются правила подписи." });
    return;
  }
  if (value.caption.maxChars !== 45) {
    issues.push({ path: `${path}.caption.maxChars`, message: "Лимит подписи universal-v1 должен быть ровно 45 символов." });
  }
  if (value.caption.maxLines !== 2) {
    issues.push({ path: `${path}.caption.maxLines`, message: "Подпись должна полностью помещаться максимум в две строки." });
  }
  if (!["left", "center", "right"].includes(String(value.caption.align))) {
    issues.push({ path: `${path}.caption.align`, message: "Недопустимое выравнивание подписи." });
  }
  if (!["body", "handwritten"].includes(String(value.caption.fontToken))) {
    issues.push({ path: `${path}.caption.fontToken`, message: "Недопустимый типографический токен подписи." });
  }
  if (typeof value.caption.minScale !== "number" || value.caption.minScale < 0.5 || value.caption.minScale > 1) {
    issues.push({ path: `${path}.caption.minScale`, message: "Минимальный масштаб подписи должен находиться в диапазоне 0.5…1." });
  }
};

const validateTextCard = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается декларативная текстовая плашка." });
    return;
  }
  validateAsset(value.asset, `${path}.asset`, issues);
  if (!universalTextCardPresetIds.includes(value.preset as never)) {
    issues.push({ path: `${path}.preset`, message: "Неизвестный preset текстовой плашки." });
    return;
  }
  const preset = getUniversalTextCardPreset(value.preset as UniversalTextCardPresetId);
  if (isRecord(value.asset) && (value.asset.width !== preset.source.width || value.asset.height !== preset.source.height)) {
    issues.push({ path: `${path}.asset`, message: `Ассет preset-а ${preset.id} должен иметь размер ${preset.source.width} × ${preset.source.height}.` });
  }
};

const validateSectionUnderlay = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value)) {
    issues.push({ path, message: "Ожидается декларативная подложка блока." });
    return;
  }
  validateAsset(value.asset, `${path}.asset`, issues);
  if (!universalSectionUnderlayPresetIds.includes(value.preset as never)) {
    issues.push({ path: `${path}.preset`, message: "Неизвестный preset подложки." });
  }
  if (value.opacity !== undefined && (typeof value.opacity !== "number" || value.opacity < 0 || value.opacity > 1)) {
    issues.push({ path: `${path}.opacity`, message: "Прозрачность должна находиться в диапазоне 0…1." });
  }
  if (value.focalPoint !== undefined) {
    if (!isRecord(value.focalPoint)) {
      issues.push({ path: `${path}.focalPoint`, message: "Ожидается нормализованная точка фокуса." });
    } else {
      for (const key of ["x", "y"] as const) {
        const coordinate = value.focalPoint[key];
        if (typeof coordinate !== "number" || coordinate < 0 || coordinate > 1) {
          issues.push({ path: `${path}.focalPoint.${key}`, message: "Координата должна находиться в диапазоне 0…1." });
        }
      }
    }
  }
};

const validateFont = (
  value: unknown,
  path: string,
  issues: TemplateProfileValidationIssue[]
) => {
  if (!isRecord(value) || typeof value.family !== "string" || value.family.trim().length === 0) {
    issues.push({ path, message: "Типографический токен должен содержать семейство шрифта." });
    return;
  }
  if (![400, 500, 600, 700, 800, 900].includes(Number(value.weight))) {
    issues.push({ path: `${path}.weight`, message: "Недопустимый вес шрифта." });
  }
};

export const validateTemplateProfile = (value: unknown): TemplateProfileValidationResult => {
  const issues: TemplateProfileValidationIssue[] = [];
  validateDeclarativeValue(value, "", issues);

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "", message: "Профиль должен быть объектом." }, ...issues] };
  }

  if (typeof value.id !== "string" || !idPattern.test(value.id)) {
    issues.push({ path: "id", message: "ID шаблона должен быть непустым kebab-case идентификатором." });
  }
  if (value.family !== UNIVERSAL_TEMPLATE_FAMILY) {
    issues.push({ path: "family", message: `Ожидается семейство ${UNIVERSAL_TEMPLATE_FAMILY}.` });
  }
  if (!universalLayoutPresetIds.includes(value.layoutPreset as UniversalLayoutPresetId)) {
    issues.push({ path: "layoutPreset", message: "Неизвестный структурный preset шаблона." });
  }

  if (!isRecord(value.metadata)) {
    issues.push({ path: "metadata", message: "Отсутствуют метаданные шаблона." });
  } else {
    for (const key of ["name", "description"] as const) {
      if (typeof value.metadata[key] !== "string" || value.metadata[key].trim().length === 0) {
        issues.push({ path: `metadata.${key}`, message: "Поле обязательно." });
      }
    }
    validateColor(value.metadata.accent, "metadata.accent", issues);
    validateAsset(value.metadata.preview, "metadata.preview", issues);
  }

  if (!isRecord(value.assets)) {
    issues.push({ path: "assets", message: "Отсутствует набор ассетов." });
  } else {
    validateAsset(value.assets.page, "assets.page", issues, true);
    if (!Array.isArray(value.assets.greetingCards)) {
      issues.push({ path: "assets.greetingCards", message: "Ожидается массив подложек поздравлений." });
    } else {
      if (value.assets.greetingCards.length !== 0 && value.assets.greetingCards.length !== 4) {
        issues.push({ path: "assets.greetingCards", message: "Нужно либо 0, либо ровно 4 циклические подложки поздравлений." });
      }
      value.assets.greetingCards.forEach((underlay, index) => validateSectionUnderlay(underlay, `assets.greetingCards.${index}`, issues));
    }
    for (const collection of ["qualityCards", "quoteCards"] as const) {
      const cards = value.assets[collection];
      if (!Array.isArray(cards)) {
        issues.push({ path: `assets.${collection}`, message: "Ожидается массив текстовых плашек." });
      } else {
        cards.forEach((card, index) => validateTextCard(card, `assets.${collection}.${index}`, issues));
      }
    }
    if (!isRecord(value.assets.sections)) {
      issues.push({ path: "assets.sections", message: "Ожидается карта поверхностей блоков." });
    } else {
      Object.entries(value.assets.sections).forEach(([key, asset]) => {
        if (!universalTemplateBlockOrder.includes(key as UniversalTemplateBlockId)) {
          issues.push({ path: `assets.sections.${key}`, message: "Неизвестный семантический блок." });
        } else {
          validateSectionUnderlay(asset, `assets.sections.${key}`, issues);
        }
      });
    }
    if (!isRecord(value.assets.photoFrames)) {
      issues.push({ path: "assets.photoFrames", message: "Отсутствуют профили фоторамок." });
    } else {
      validatePhotoFrame(value.assets.photoFrames.messagePortrait, "assets.photoFrames.messagePortrait", issues);
      validatePhotoFrame(value.assets.photoFrames.messageLandscape, "assets.photoFrames.messageLandscape", issues);
      validatePhotoFrame(value.assets.photoFrames.memory, "assets.photoFrames.memory", issues);
    }
    validateAsset(value.assets.footer, "assets.footer", issues, true);
    if (!Array.isArray(value.assets.decor)) {
      issues.push({ path: "assets.decor", message: "Ожидается массив декоративных слоёв." });
    } else {
      value.assets.decor.forEach((layer, index) => {
        const path = `assets.decor.${index}`;
        if (!isRecord(layer)) {
          issues.push({ path, message: "Ожидается декоративный слой." });
          return;
        }
        if (typeof layer.id !== "string" || !idPattern.test(layer.id)) {
          issues.push({ path: `${path}.id`, message: "ID слоя должен быть в kebab-case." });
        }
        validateAsset(layer.asset, `${path}.asset`, issues);
        if (layer.anchor !== "templateRoot" && !universalTemplateBlockOrder.includes(layer.anchor as UniversalTemplateBlockId)) {
          issues.push({ path: `${path}.anchor`, message: "Неизвестная привязка декоративного слоя." });
        }
        validateRect(layer.rect, `${path}.rect`, issues);
        if (layer.opacity !== undefined && (typeof layer.opacity !== "number" || layer.opacity < 0 || layer.opacity > 1)) {
          issues.push({ path: `${path}.opacity`, message: "Прозрачность должна находиться в диапазоне 0…1." });
        }
      });
    }
  }

  if (!isRecord(value.typography)) {
    issues.push({ path: "typography", message: "Отсутствует типографическая шкала." });
  } else {
    validateFont(value.typography.heading, "typography.heading", issues);
    validateFont(value.typography.body, "typography.body", issues);
    validateFont(value.typography.handwritten, "typography.handwritten", issues);
  }

  if (!isRecord(value.colors)) {
    issues.push({ path: "colors", message: "Отсутствует палитра шаблона." });
  } else {
    for (const key of ["page", "text", "muted", "accent", "surface"] as const) {
      validateColor(value.colors[key], `colors.${key}`, issues);
    }
    if (!isRecord(value.colors.surfaces)) {
      issues.push({ path: "colors.surfaces", message: "Ожидается карта цветов поверхностей." });
    } else {
      Object.entries(value.colors.surfaces).forEach(([key, color]) => {
        if (!universalTemplateBlockOrder.includes(key as UniversalTemplateBlockId)) {
          issues.push({ path: `colors.surfaces.${key}`, message: "Неизвестный семантический блок." });
        } else {
          validateColor(color, `colors.surfaces.${key}`, issues);
        }
      });
    }
  }

  if (!isRecord(value.intro)) {
    issues.push({ path: "intro", message: "Отсутствует облегчённый профиль анимации открытия." });
  } else {
    validateColor(value.intro.surface, "intro.surface", issues);
    validateColor(value.intro.text, "intro.text", issues);
    validateColor(value.intro.accent, "intro.accent", issues);
    validateAsset(value.intro.mark, "intro.mark", issues, true);
    validateAsset(value.intro.pattern, "intro.pattern", issues, true);
  }

  if (!isRecord(value.public) || !Array.isArray(value.public.blocks)) {
    issues.push({ path: "public.blocks", message: "Ожидается список публичных блоков." });
  } else {
    const actual = value.public.blocks;
    const canonical = universalPublicBlocks.filter((block) => actual.includes(block));
    if (actual.some((block) => !universalPublicBlocks.includes(block as UniversalPublicBlockId))) {
      issues.push({ path: "public.blocks", message: "Публичный профиль содержит запрещённый блок." });
    }
    if (new Set(actual).size !== actual.length) {
      issues.push({ path: "public.blocks", message: "Публичные блоки не должны повторяться." });
    }
    if (canonical.some((block, index) => block !== actual[index])) {
      issues.push({ path: "public.blocks", message: "Публичные блоки должны следовать каноническому порядку." });
    }
  }

  if (!isRecord(value.export) || value.export.profile !== UNIVERSAL_EXPORT_PROFILE) {
    issues.push({ path: "export.profile", message: `Ожидается профиль ${UNIVERSAL_EXPORT_PROFILE}.` });
  }
  if (!isRecord(value.performance)) {
    issues.push({ path: "performance", message: "Отсутствуют бюджеты производительности." });
  } else {
    for (const key of ["networkBudget", "decodedMemoryBudget"] as const) {
      if (!Number.isInteger(value.performance[key]) || Number(value.performance[key]) <= 0) {
        issues.push({ path: `performance.${key}`, message: "Бюджет должен быть положительным целым числом байт." });
      }
    }
  }
  if (!isRecord(value.demo) || !fixtureIds.has(value.demo.fixture as UniversalTemplateFixtureId)) {
    issues.push({ path: "demo.fixture", message: "Неизвестный общий fixture." });
  }

  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, profile: value as TemplateProfile, issues: [] };
};

export const defineTemplate = <T extends TemplateProfile>(profile: T): T => {
  const result = validateTemplateProfile(profile);
  if (!result.ok) {
    const details = result.issues.map((issue) => `${issue.path || "profile"}: ${issue.message}`).join("\n");
    throw new Error(`Невалидный TemplateProfile:\n${details}`);
  }
  return profile;
};
