import { checkTemplateAssets, loadTemplateManifests } from "./template-pipeline-lib.mjs";

const manifests = await loadTemplateManifests(process.cwd());
let failed = false;
for (const { value } of manifests) {
  const result = await checkTemplateAssets(process.cwd(), value);
  console.log(`${value.templateId}: ${result.assetCount} ассетов, ${(result.networkBytes / 1024 / 1024).toFixed(1)} MiB network, ${(result.decodedMemoryBytes / 1024 / 1024).toFixed(1)} MiB decoded`);
  if (!result.ok) {
    failed = true;
    result.failures.forEach((failure) => console.error(`${value.templateId}: ${failure}`));
  }
}
console.log(`TEMPLATE_ASSETS_CHECKED ${manifests.length}`);
if (failed) process.exitCode = 1;
