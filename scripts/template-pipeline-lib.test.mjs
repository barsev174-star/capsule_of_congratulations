import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import ts from "typescript";
import {
  checkTemplateAssets,
  optimizeTemplateAssets,
  scaffoldTemplate,
  validateTemplateId
} from "./template-pipeline-lib.mjs";

sharp.cache(false);

const temporaryRoots = [];
const temporaryRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), "slovesto-template-pipeline-"));
  temporaryRoots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })));
}, 30_000);

describe("template pipeline", () => {
  it("validates ids and scaffolds a registered universal profile without overwriting", async () => {
    const root = await temporaryRoot();
    const registryDir = join(root, "src", "lib", "templates");
    await mkdir(registryDir, { recursive: true });
    await writeFile(join(registryDir, "generated-registry.ts"), `// template:new:imports\nexport const generatedUniversalTemplateRegistrations = [\n  // template:new:entries\n] as const;\nexport const generatedUniversalTemplateIds = [\n  // template:new:ids\n] as const;\n`, "utf8");

    const result = await scaffoldTemplate({ root, id: "northern-light", name: "Северное сияние" });
    const [profile, registration, manifest, registry] = await Promise.all([
      readFile(join(result.templateDir, "profile.ts"), "utf8"),
      readFile(join(result.templateDir, "registration.ts"), "utf8"),
      readFile(join(result.templateDir, "template.assets.json"), "utf8"),
      readFile(join(registryDir, "generated-registry.ts"), "utf8")
    ]);

    expect(profile).toContain('id: "northern-light"');
    expect(profile).toContain('defineSectionUnderlay');
    expect(profile).toContain('"adaptive-frame"');
    expect(profile).not.toContain('qualities: defineSectionUnderlay');
    expect(profile).not.toContain('quotes: defineSectionUnderlay');
    expect(ts.transpileModule(profile, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true }).diagnostics).toEqual([]);
    expect(ts.transpileModule(registration, { compilerOptions: {}, reportDiagnostics: true }).diagnostics).toEqual([]);
    expect(registration).toContain('import type { UniversalTemplateRegistration }');
    expect(registration).not.toContain("defineUniversalTemplateRegistration(");
    expect(JSON.parse(manifest).preview.output).toBe("preview.webp");
    expect(JSON.parse(manifest).assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "page", width: 1536, height: 1024 }),
      expect.objectContaining({ id: "section-closing", width: 1376, height: 768 }),
      expect.objectContaining({ id: "greeting-card-4", width: 1200, height: 400 })
    ]));
    expect(JSON.parse(manifest).assets.filter((entry) => entry.id.startsWith("greeting-card-"))).toHaveLength(4);
    expect(JSON.parse(manifest).assets.some((entry) => entry.id === "section-hero" || entry.id === "section-qualities" || entry.id === "section-quotes")).toBe(false);
    expect(registry).toContain('from "@/templates/northern-light/registration"');
    await expect(scaffoldTemplate({ root, id: "northern-light", name: "Повтор" })).rejects.toThrow("уже существует");
    expect(() => validateTemplateId("../escape")).toThrow("kebab-case");
  });

  it("optimizes declared assets, creates preview and enforces geometry/transparency/budgets", async () => {
    const root = await temporaryRoot();
    const sourceDir = join(root, "template-assets", "pipeline-test", "source");
    await mkdir(sourceDir, { recursive: true });
    await Promise.all([
      sharp({ create: { width: 10, height: 8, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toFile(join(sourceDir, "hero.png")),
      sharp({ create: { width: 10, height: 8, channels: 4, background: { r: 255, g: 255, b: 255, alpha: .35 } } }).png().toFile(join(sourceDir, "frame.png"))
    ]);
    const manifest = {
      version: 1,
      templateId: "pipeline-test",
      budgets: { networkBytes: 1_000_000, decodedMemoryBytes: 1_000_000, individualBytes: 500_000 },
      preview: { sourceAssetId: "hero", output: "preview.webp", width: 12, height: 6 },
      assets: [
        { id: "hero", source: "hero.png", output: "hero.webp", width: 8, height: 6, alpha: "opaque", fit: "cover" },
        { id: "frame", source: "frame.png", output: "frame.webp", width: 8, height: 6, alpha: "transparent", fit: "cover" }
      ]
    };

    await optimizeTemplateAssets(root, manifest);
    const result = await checkTemplateAssets(root, manifest);
    expect(result).toMatchObject({ ok: true, assetCount: 3 });

    manifest.assets[1].output = "broken-frame.webp";
    await sharp({ create: { width: 3, height: 3, channels: 3, background: "white" } }).webp().toFile(join(root, "public", "templates", "pipeline-test", "broken-frame.webp"));
    const broken = await checkTemplateAssets(root, manifest);
    expect(broken.ok).toBe(false);
    expect(broken.failures.join(" ")).toContain("геометрия");
    expect(broken.failures.join(" ")).toContain("требуется прозрачность");
  });
});
