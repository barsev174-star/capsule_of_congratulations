import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const cssPath = join(projectRoot, "src", "components", "final-card", "final-card.module.css");
const css = await readFile(cssPath, "utf8");

const profiles = {
  "paper-birthday": {
    assetDirectory: "scrapbook-clean",
    networkBudget: 52 * 1024 * 1024,
    decodedMemoryBudget: 180 * 1024 * 1024,
    individualBudget: 3 * 1024 * 1024
  },
  "route-adventure": {
    assetDirectory: "route-adventure",
    networkBudget: 12 * 1024 * 1024,
    decodedMemoryBudget: 96 * 1024 * 1024,
    individualBudget: 1024 * 1024
  }
};

const formatMiB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
const failures = [];

for (const [templateId, profile] of Object.entries(profiles)) {
  const expression = new RegExp(`/templates/${profile.assetDirectory}/([^"')]+)\\.(webp|png|jpe?g)`, "g");
  const assetNames = [...new Set([...css.matchAll(expression)].map((match) => `${match[1]}.${match[2]}`))];
  const assetDir = join(projectRoot, "public", "templates", profile.assetDirectory);
  let networkBytes = 0;
  let decodedBytes = 0;

  if (assetNames.length === 0) failures.push(`${templateId}: no CSS assets found`);

  for (const name of assetNames) {
    const path = join(assetDir, name);
    try {
      await access(path);
    } catch {
      failures.push(`${templateId}: missing asset ${name}`);
      continue;
    }

    const [file, metadata] = await Promise.all([stat(path), sharp(path).metadata()]);
    networkBytes += file.size;
    decodedBytes += (metadata.width ?? 0) * (metadata.height ?? 0) * 4;
    if (file.size > profile.individualBudget) {
      failures.push(`${templateId}: ${name} exceeds ${formatMiB(profile.individualBudget)} (${formatMiB(file.size)})`);
    }
  }

  if (networkBytes > profile.networkBudget) {
    failures.push(`${templateId}: network budget exceeded (${formatMiB(networkBytes)} > ${formatMiB(profile.networkBudget)})`);
  }
  if (decodedBytes > profile.decodedMemoryBudget) {
    failures.push(`${templateId}: decoded-memory budget exceeded (${formatMiB(decodedBytes)} > ${formatMiB(profile.decodedMemoryBudget)})`);
  }

  console.log(
    `${templateId}: ${assetNames.length} CSS assets, ${formatMiB(networkBytes)} network, ${formatMiB(decodedBytes)} decoded`
  );
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  process.exitCode = 1;
}
