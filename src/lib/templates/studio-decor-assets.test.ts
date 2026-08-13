import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  saveTemplateStudioDecorAsset,
  TemplateStudioDecorAssetError
} from "@/lib/templates/studio-decor-assets";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("template studio decor assets", () => {
  it("сохраняет изображение в каталог декора шаблона и возвращает web-путь", async () => {
    const root = await mkdtemp(join(tmpdir(), "slovesto-decor-"));
    roots.push(root);
    const bytes = await sharp({
      create: { width: 64, height: 48, channels: 4, background: { r: 20, g: 120, b: 180, alpha: 0.5 } }
    }).png().toBuffer();
    const file = {
      name: "Цветы в углу.png",
      type: "image/png",
      size: bytes.length,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    } as File;

    const asset = await saveTemplateStudioDecorAsset({ projectRoot: root, templateId: "daylight-proof", file });

    expect(asset).toMatchObject({ width: 64, height: 48 });
    expect(asset.src).toMatch(/^\/templates\/daylight-proof\/decor\/decor-[a-f0-9]{10}\.webp$/);
    const saved = await readFile(join(root, "public", asset.src.slice(1)));
    await expect(sharp(saved).metadata()).resolves.toMatchObject({ format: "webp", width: 64, height: 48 });
  });

  it("отклоняет файловый путь вместо поддерживаемого изображения", async () => {
    const root = await mkdtemp(join(tmpdir(), "slovesto-decor-"));
    roots.push(root);
    const file = {
      name: "decor.txt",
      type: "text/plain",
      size: 12,
      arrayBuffer: async () => new TextEncoder().encode("not-an-image").buffer
    } as File;

    await expect(saveTemplateStudioDecorAsset({ projectRoot: root, templateId: "daylight-proof", file }))
      .rejects.toBeInstanceOf(TemplateStudioDecorAssetError);
  });
});
