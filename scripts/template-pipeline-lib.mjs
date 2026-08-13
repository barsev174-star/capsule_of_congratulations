import { access, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import sharp from "sharp";

export const TEMPLATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const manifestName = "template.assets.json";
const importMarker = "// template:new:imports";
const entryMarker = "  // template:new:entries";
const idMarker = "  // template:new:ids";

const assertInside = (root, target) => {
  const normalizedRoot = `${resolve(root)}${sep}`.toLowerCase();
  const normalizedTarget = resolve(target).toLowerCase();
  if (!normalizedTarget.startsWith(normalizedRoot)) throw new Error(`Путь выходит за пределы проекта: ${target}`);
};

export const validateTemplateId = (value) => {
  const id = String(value ?? "").trim();
  if (!TEMPLATE_ID_PATTERN.test(id)) throw new Error("ID шаблона должен быть kebab-case идентификатором.");
  if (["paper-birthday", "route-adventure", "universal-sandbox"].includes(id)) throw new Error(`ID ${id} зарезервирован.`);
  return id;
};

const asset = (id, source, output, width, height, alpha = "either") => ({ id, source, output, width, height, alpha, fit: "cover" });

export const createAssetManifest = (id) => ({
  version: 1,
  templateId: id,
  budgets: {
    networkBytes: 8_000_000,
    decodedMemoryBytes: 64_000_000,
    individualBytes: 2_000_000
  },
  preview: { sourceAssetId: "section-hero", output: "preview.webp", width: 1200, height: 630 },
  assets: [
    asset("page", "page.png", "page.webp", 1536, 1024, "opaque"),
    ...["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"].map((block) =>
      asset(`section-${block}`, `section-${block}.png`, `section-${block}.webp`, 1376, 768)
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      asset(`greeting-card-${index + 1}`, `greeting-card-${index + 1}.png`, `greeting-card-${index + 1}.webp`, 1200, 400)
    ),
    asset("quality-card", "quality-card.png", "quality-card.webp", 480, 258),
    asset("quote-card", "quote-card.png", "quote-card.webp", 1402, 1122),
    asset("photo-frame-portrait-base", "photo-frame-portrait-base.png", "photo-frame-portrait-base.webp", 802, 1122, "transparent"),
    asset("photo-frame-portrait-overlay", "photo-frame-portrait-overlay.png", "photo-frame-portrait-overlay.webp", 802, 1122, "transparent"),
    asset("photo-frame-landscape-base", "photo-frame-landscape-base.png", "photo-frame-landscape-base.webp", 1122, 802, "transparent"),
    asset("photo-frame-landscape-overlay", "photo-frame-landscape-overlay.png", "photo-frame-landscape-overlay.webp", 1122, 802, "transparent")
  ]
});

const profileSource = (id, name) => `import { defineTemplate, defineTextCard } from "@/lib/templates/profile";
import { defineSectionUnderlay } from "@/lib/templates/section-underlays";

const asset = (src: \`/templates/${id}/\${string}\`, width: number, height: number) => ({ src, width, height });
const frame = (preset: "portrait-polaroid" | "landscape-polaroid", base: \`/templates/${id}/\${string}\`, overlay: \`/templates/${id}/\${string}\`, width: number, height: number) => ({
  preset,
  base: asset(base, width, height),
  overlay: asset(overlay, width, height),
  fit: "cover" as const,
  caption: { maxChars: 45 as const, maxLines: 2 as const, align: "center" as const, fontToken: "handwritten" as const, minScale: 0.7 }
});

export const ${id.replaceAll("-", "_")}Profile = defineTemplate({
  id: "${id}",
  family: "universal-v1",
  layoutPreset: "route-v1",
  metadata: {
    name: ${JSON.stringify(name)},
    description: "Универсальный шаблон Slovesto.",
    accent: "#e9652f",
    preview: asset("/templates/${id}/preview.webp", 1200, 630)
  },
  assets: {
    page: asset("/templates/${id}/page.webp", 1536, 1024),
    sections: {
      hero: defineSectionUnderlay(asset("/templates/${id}/section-hero.webp", 1376, 768), "adaptive-frame"),
      summary: defineSectionUnderlay(asset("/templates/${id}/section-summary.webp", 1376, 768), "adaptive-frame"),
      qualities: defineSectionUnderlay(asset("/templates/${id}/section-qualities.webp", 1376, 768), "adaptive-frame"),
      messages: defineSectionUnderlay(asset("/templates/${id}/section-messages.webp", 1376, 768), "adaptive-frame"),
      memories: defineSectionUnderlay(asset("/templates/${id}/section-memories.webp", 1376, 768), "adaptive-frame"),
      quotes: defineSectionUnderlay(asset("/templates/${id}/section-quotes.webp", 1376, 768), "adaptive-frame"),
      closing: defineSectionUnderlay(asset("/templates/${id}/section-closing.webp", 1376, 768), "adaptive-frame")
    },
    greetingCards: [
      defineSectionUnderlay(asset("/templates/${id}/greeting-card-1.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/${id}/greeting-card-2.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/${id}/greeting-card-3.webp", 1200, 400), "adaptive-frame"),
      defineSectionUnderlay(asset("/templates/${id}/greeting-card-4.webp", 1200, 400), "adaptive-frame")
    ],
    qualityCards: [defineTextCard(asset("/templates/${id}/quality-card.webp", 480, 258), "quality-pill")],
    quoteCards: [defineTextCard(asset("/templates/${id}/quote-card.webp", 1402, 1122), "quote-panel")],
    photoFrames: {
      messagePortrait: frame("portrait-polaroid", "/templates/${id}/photo-frame-portrait-base.webp", "/templates/${id}/photo-frame-portrait-overlay.webp", 802, 1122),
      messageLandscape: frame("landscape-polaroid", "/templates/${id}/photo-frame-landscape-base.webp", "/templates/${id}/photo-frame-landscape-overlay.webp", 1122, 802),
      memory: frame("landscape-polaroid", "/templates/${id}/photo-frame-landscape-base.webp", "/templates/${id}/photo-frame-landscape-overlay.webp", 1122, 802)
    },
    decor: []
  },
  typography: {
    heading: { family: "Inter", weight: 800 },
    body: { family: "Inter", weight: 400 },
    handwritten: { family: "Caveat", weight: 600 }
  },
  colors: {
    page: "#f7f8fa", text: "#202124", muted: "#5f6368", accent: "#e9652f", surface: "#ffffff",
    surfaces: { hero: "#ffffff", qualities: "#ffffff", memories: "#ffffff", quotes: "#f7f8fa", closing: "#ffffff" }
  },
  intro: { surface: "#ffffff", text: "#202124", accent: "#e9652f" },
  public: { blocks: ["hero", "qualities", "memories", "quotes"] },
  export: { profile: "universal-export-v1" },
  performance: { networkBudget: 8_000_000, decodedMemoryBudget: 64_000_000 },
  demo: { fixture: "full-card-default" }
});
`;

const registrationSource = (id, name) => `import type { UniversalTemplateRegistration } from "@/lib/templates/registry";
import { ${id.replaceAll("-", "_")}Profile } from "./profile";

export const ${id.replaceAll("-", "_")}Registration = {
  id: ${id.replaceAll("-", "_")}Profile.id,
  family: "universal-v1",
  profile: ${id.replaceAll("-", "_")}Profile,
  catalog: {
    name: ${JSON.stringify(name)},
    description: "Универсальный шаблон Slovesto.",
    recommendedFor: ["personal", "celebration"],
    accent: "#e9652f",
    availability: "studio"
  }
} satisfies UniversalTemplateRegistration;
`;

export const scaffoldTemplate = async ({ root, id: rawId, name }) => {
  const id = validateTemplateId(rawId);
  const title = String(name ?? "").trim() || id;
  const templateDir = join(root, "src", "templates", id);
  const sourceDir = join(root, "template-assets", id, "source");
  const outputDir = join(root, "public", "templates", id);
  const registryPath = join(root, "src", "lib", "templates", "generated-registry.ts");
  for (const path of [templateDir, sourceDir, outputDir, registryPath]) assertInside(root, path);
  try { await access(templateDir); throw new Error(`Шаблон ${id} уже существует.`); } catch (error) { if (error?.code !== "ENOENT") throw error; }

  const registry = await readFile(registryPath, "utf8");
  if (!registry.includes(importMarker) || !registry.includes(entryMarker) || !registry.includes(idMarker)) throw new Error("В generated-registry.ts отсутствуют маркеры template:new.");
  const variable = `${id.replaceAll("-", "_")}Registration`;
  const nextRegistry = registry
    .replace(importMarker, `${importMarker}\nimport { ${variable} } from "@/templates/${id}/registration";`)
    .replace(entryMarker, `  ${variable},\n${entryMarker}`)
    .replace(idMarker, `  "${id}",\n${idMarker}`);

  await Promise.all([mkdir(templateDir, { recursive: true }), mkdir(sourceDir, { recursive: true }), mkdir(outputDir, { recursive: true })]);
  try {
    await Promise.all([
      writeFile(join(templateDir, "profile.ts"), profileSource(id, title), "utf8"),
      writeFile(join(templateDir, "registration.ts"), registrationSource(id, title), "utf8"),
      writeFile(join(templateDir, manifestName), `${JSON.stringify(createAssetManifest(id), null, 2)}\n`, "utf8"),
      writeFile(join(sourceDir, ".gitkeep"), "", "utf8"),
      writeFile(join(outputDir, ".gitkeep"), "", "utf8")
    ]);
    await writeFile(registryPath, nextRegistry, "utf8");
  } catch (error) {
    await Promise.all([
      rm(templateDir, { recursive: true, force: true }),
      rm(join(root, "template-assets", id), { recursive: true, force: true }),
      rm(outputDir, { recursive: true, force: true })
    ]);
    throw error;
  }
  return { id, templateDir, sourceDir, outputDir };
};

export const loadTemplateManifests = async (root) => {
  const templatesRoot = join(root, "src", "templates");
  let entries = [];
  try { entries = await readdir(templatesRoot, { withFileTypes: true }); } catch (error) { if (error?.code === "ENOENT") return []; throw error; }
  const manifests = [];
  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(templatesRoot, entry.name, manifestName);
    try {
      const value = JSON.parse(await readFile(path, "utf8"));
      if (value.templateId !== entry.name || value.version !== 1 || !Array.isArray(value.assets)) throw new Error(`Некорректный каталог ${relative(root, path)}.`);
      manifests.push({ path, value });
    } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  return manifests;
};

const alphaState = async (path, metadata) => {
  if (!metadata.hasAlpha) return false;
  const stats = await sharp(path).stats();
  return (stats.channels[3]?.min ?? 255) < 255;
};

export const optimizeTemplateAssets = async (root, manifest) => {
  const id = manifest.templateId;
  const sourceRoot = join(root, "template-assets", id, "source");
  const outputRoot = join(root, "public", "templates", id);
  await mkdir(outputRoot, { recursive: true });
  for (const item of manifest.assets) {
    const input = join(sourceRoot, item.source);
    const output = join(outputRoot, item.output);
    assertInside(sourceRoot, input); assertInside(outputRoot, output);
    await mkdir(dirname(output), { recursive: true });
    const pipeline = sharp(input, { limitInputPixels: false }).resize(item.width, item.height, { fit: item.fit ?? "cover", position: "centre", kernel: sharp.kernel.lanczos3 });
    const extension = extname(output).toLowerCase();
    if (extension === ".webp") await pipeline.webp({ quality: 84, alphaQuality: 92, effort: 6 }).toFile(output);
    else if (extension === ".png") await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(output);
    else if ([".jpg", ".jpeg"].includes(extension)) await pipeline.jpeg({ quality: 88, mozjpeg: true }).toFile(output);
    else throw new Error(`${id}: неподдерживаемый формат ${extension}`);
  }
  const previewAsset = manifest.assets.find((item) => item.id === manifest.preview.sourceAssetId);
  if (!previewAsset) throw new Error(`${id}: не найден sourceAssetId для preview.`);
  await sharp(join(outputRoot, previewAsset.output))
    .resize(manifest.preview.width, manifest.preview.height, { fit: "cover", position: "centre" })
    .webp({ quality: 84, effort: 6 })
    .toFile(join(outputRoot, manifest.preview.output));
};

export const checkTemplateAssets = async (root, manifest) => {
  const failures = [];
  const outputRoot = join(root, "public", "templates", manifest.templateId);
  let networkBytes = 0;
  let decodedMemoryBytes = 0;
  const items = [...manifest.assets, { id: "preview", output: manifest.preview.output, width: manifest.preview.width, height: manifest.preview.height, alpha: "either" }];
  for (const item of items) {
    const path = join(outputRoot, item.output);
    assertInside(outputRoot, path);
    try {
      const [file, metadata] = await Promise.all([stat(path), sharp(path).metadata()]);
      networkBytes += file.size;
      decodedMemoryBytes += (metadata.width ?? 0) * (metadata.height ?? 0) * 4;
      if (metadata.width !== item.width || metadata.height !== item.height) failures.push(`${item.id}: геометрия ${metadata.width}×${metadata.height}, ожидалось ${item.width}×${item.height}`);
      if (file.size > manifest.budgets.individualBytes) failures.push(`${item.id}: превышен индивидуальный бюджет`);
      const transparent = await alphaState(path, metadata);
      if (item.alpha === "transparent" && !transparent) failures.push(`${item.id}: требуется прозрачность`);
      if (item.alpha === "opaque" && transparent) failures.push(`${item.id}: прозрачность запрещена`);
    } catch (error) { failures.push(`${item.id}: файл отсутствует или повреждён (${error.message})`); }
  }
  if (networkBytes > manifest.budgets.networkBytes) failures.push(`превышен сетевой бюджет: ${networkBytes} > ${manifest.budgets.networkBytes}`);
  if (decodedMemoryBytes > manifest.budgets.decodedMemoryBytes) failures.push(`превышен decoded-memory бюджет: ${decodedMemoryBytes} > ${manifest.budgets.decodedMemoryBytes}`);
  return { ok: failures.length === 0, failures, networkBytes, decodedMemoryBytes, assetCount: items.length };
};
