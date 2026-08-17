import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { UniversalTemplateExportCard, universalExportFormats } from "@/components/templates/universal-v1/universal-export-card";
import { cardTemplates } from "@/lib/cards/templates";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { resolveTemplateExportAsset } from "@/lib/templates/export-asset-url";
import { validateTemplateProfile } from "@/lib/templates/profile";
import { isProductTemplateId, studioTemplateRegistrations } from "@/lib/templates/registry";
import { listTemplateProfileAssets } from "@/lib/templates/studio";
import { buildUniversalFixtureViewModel } from "@/lib/templates/view-model";

type AssetManifest = {
  templateId: string;
  preview: { output: string; width: number; height: number };
  assets: Array<{ output: string; width: number; height: number }>;
};

const projectRoot = process.cwd();
const runtimeRoots = [
  "src/app/gift",
  "src/app/manage",
  "src/app/preview",
  "src/app/share",
  "src/components/gift-intro",
  "src/components/templates",
  "src/lib/cards",
  "src/lib/manage",
  "src/lib/public-shares"
];

const listRuntimeSources = async (relativeDirectory: string): Promise<string[]> => {
  const absoluteDirectory = join(projectRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return listRuntimeSources(relativePath);
    if (!/\.(?:ts|tsx)$/.test(entry.name) || /\.test\.(?:ts|tsx)$/.test(entry.name)) return [];
    return [relativePath];
  }));
  return nested.flat();
};

describe("universal template launch gate", () => {
  it.each(studioTemplateRegistrations)("validates registration, catalog and every asset for $id", async (registration) => {
    const { id, profile, catalog } = registration;
    const validation = validateTemplateProfile(profile);
    expect(validation).toEqual(expect.objectContaining({ ok: true, issues: [] }));
    expect(dispatchTemplateRenderer(id)).toEqual({ kind: "universal-v1", registration });

    const manifestPath = join(projectRoot, "src", "templates", id, "template.assets.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as AssetManifest;
    expect(manifest.templateId).toBe(id);
    expect(profile.metadata.preview.src).toBe(`/templates/${id}/${manifest.preview.output}`);
    expect(profile.metadata.preview).toEqual(expect.objectContaining({
      width: manifest.preview.width,
      height: manifest.preview.height
    }));

    const declaredOutputs = new Map<string, { width: number; height: number }>([
      [manifest.preview.output, manifest.preview],
      ...manifest.assets.map((asset) => [asset.output, asset] as const)
    ]);
    const uniqueAssets = new Map(listTemplateProfileAssets(profile).map(({ asset }) => [asset.src, asset]));
    for (const asset of uniqueAssets.values()) {
      const expectedPrefix = `/templates/${id}/`;
      expect(asset.src.startsWith(expectedPrefix), `${id}: ${asset.src} must stay inside its template directory`).toBe(true);
      const output = asset.src.slice(expectedPrefix.length);
      expect(declaredOutputs.has(output), `${id}: ${output} is absent from template.assets.json`).toBe(true);
      const absoluteAssetPath = join(projectRoot, "public", asset.src.slice(1));
      await expect(access(absoluteAssetPath)).resolves.toBeUndefined();
      const metadata = await sharp(absoluteAssetPath).metadata();
      expect({ width: metadata.width, height: metadata.height }).toEqual({ width: asset.width, height: asset.height });
    }

    const catalogEntry = cardTemplates.find((template) => template.id === id);
    if (catalog.availability === "product") {
      expect(isProductTemplateId(id)).toBe(true);
      expect(catalogEntry).toEqual(expect.objectContaining({
        id,
        name: catalog.name,
        description: catalog.description,
        preview: profile.metadata.preview.src,
        introKicker: profile.intro.kicker,
        introPreset: profile.intro.preset ?? "default"
      }));
    } else {
      expect(isProductTemplateId(id)).toBe(false);
      expect(catalogEntry).toBeUndefined();
    }
  });

  it.each(studioTemplateRegistrations)("renders every download format from the registered $id profile", (registration) => {
    const model = buildUniversalFixtureViewModel(registration.profile.demo.fixture, {
      templateId: registration.id,
      scenario: "landscape-trio",
      photoCount: 3
    });

    for (const format of Object.keys(universalExportFormats) as Array<keyof typeof universalExportFormats>) {
      const markup = renderToStaticMarkup(
        <UniversalTemplateExportCard
          profile={registration.profile}
          model={model}
          format={format}
          resolveAsset={resolveTemplateExportAsset}
        />
      );
      expect(markup).toContain(`data-export-format="${format}"`);
      expect(markup).not.toMatch(/src="\/templates\//);
      expect(markup).toContain("/api/template-export-asset?src=");
    }
  });

  it("forbids template-specific branches in shared product runtime", async () => {
    const runtimeFiles = (await Promise.all(runtimeRoots.map(listRuntimeSources))).flat();
    const violations: string[] = [];
    for (const file of runtimeFiles) {
      const source = await readFile(join(projectRoot, file), "utf8");
      for (const { id } of studioTemplateRegistrations) {
        if (source.includes(`"${id}"`) || source.includes(`'${id}'`)) violations.push(`${file}: ${id}`);
      }
    }
    expect(violations, "Move template differences into its profile or a reusable preset").toEqual([]);
  });
});
