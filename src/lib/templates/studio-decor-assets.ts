import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import sharp from "sharp";
import type { TemplateAssetRef } from "@/lib/templates/profile";

const templateIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxDecorAssetBytes = 8 * 1024 * 1024;
const acceptedTypes = new Set(["image/png", "image/webp", "image/avif"]);

export class TemplateStudioDecorAssetError extends Error {}

const safeStem = (name: string) => {
  const withoutExtension = name.slice(0, Math.max(0, name.length - extname(name).length));
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "decor";
};

const assertInside = (root: string, target: string) => {
  const normalizedRoot = `${resolve(root)}${sep}`.toLowerCase();
  if (!resolve(target).toLowerCase().startsWith(normalizedRoot)) {
    throw new TemplateStudioDecorAssetError("Некорректный путь декоративного ассета.");
  }
};

export const saveTemplateStudioDecorAsset = async ({
  projectRoot,
  templateId,
  file
}: {
  projectRoot: string;
  templateId: string;
  file: File;
}): Promise<TemplateAssetRef> => {
  if (!templateIdPattern.test(templateId)) {
    throw new TemplateStudioDecorAssetError("Некорректный ID шаблона.");
  }
  if (!acceptedTypes.has(file.type) || file.size <= 0 || file.size > maxDecorAssetBytes) {
    throw new TemplateStudioDecorAssetError("Подойдут PNG, WebP или AVIF размером до 8 МБ.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(bytes).metadata().catch(() => null);
  const width = metadata?.width;
  const height = metadata?.height;
  if (!width || !height) {
    throw new TemplateStudioDecorAssetError("Не удалось определить размеры изображения.");
  }
  if (width > 4096 || height > 4096 || width * height * 4 > 64 * 1024 * 1024) {
    throw new TemplateStudioDecorAssetError("Размер изображения не должен превышать 4096 × 4096 и 64 МБ после декодирования.");
  }

  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const fileName = `${safeStem(file.name)}-${digest}.webp`;
  const templateRoot = resolve(projectRoot, "public", "templates", templateId);
  const decorRoot = resolve(templateRoot, "decor");
  const target = join(decorRoot, fileName);
  assertInside(templateRoot, target);
  await mkdir(decorRoot, { recursive: true });
  const optimized = await sharp(bytes).webp({ quality: 90, alphaQuality: 100, effort: 4 }).toBuffer();
  await writeFile(target, optimized);

  return {
    src: `/templates/${templateId}/decor/${fileName}`,
    width,
    height
  };
};
