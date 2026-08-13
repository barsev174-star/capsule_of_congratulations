import { loadTemplateManifests, optimizeTemplateAssets } from "./template-pipeline-lib.mjs";

const manifests = await loadTemplateManifests(process.cwd());
for (const { value } of manifests) {
  await optimizeTemplateAssets(process.cwd(), value);
  console.log(`${value.templateId}: ассеты и preview оптимизированы`);
}
console.log(`TEMPLATE_ASSETS_OPTIMIZED ${manifests.length}`);
