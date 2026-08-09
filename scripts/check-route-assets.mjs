import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const cssPath = join(projectRoot, "src", "components", "final-card", "final-card.module.css");
const assetDir = join(projectRoot, "public", "templates", "route-adventure");
const css = await readFile(cssPath, "utf8");
const assetNames = [...new Set(
  [...css.matchAll(/\/templates\/route-adventure\/([^"')]+)\.(webp|png)/g)].map((match) => `${match[1]}.${match[2]}`)
)];

const limits = {
  networkBytes: 12 * 1024 * 1024,
  decodedBytes: 96 * 1024 * 1024,
  individualBytes: 1024 * 1024
};
let networkBytes = 0;
let decodedBytes = 0;
const failures = [];

for (const name of assetNames) {
  const path = join(assetDir, name);
  try {
    await access(path);
  } catch {
    failures.push(`Missing Route asset: ${name}`);
    continue;
  }

  const [file, metadata] = await Promise.all([stat(path), sharp(path).metadata()]);
  networkBytes += file.size;
  decodedBytes += (metadata.width ?? 0) * (metadata.height ?? 0) * 4;
  if (file.size > limits.individualBytes) {
    failures.push(`${name} exceeds 1 MiB (${(file.size / 1024 / 1024).toFixed(2)} MiB)`);
  }
}

if (networkBytes > limits.networkBytes) failures.push(`Route network budget exceeded: ${(networkBytes / 1024 / 1024).toFixed(1)} MiB`);
if (decodedBytes > limits.decodedBytes) failures.push(`Route decoded-memory budget exceeded: ${(decodedBytes / 1024 / 1024).toFixed(1)} MiB`);

console.log(`Route asset budget: ${assetNames.length} files, ${(networkBytes / 1024 / 1024).toFixed(1)} MiB network, ${(decodedBytes / 1024 / 1024).toFixed(1)} MiB decoded`);
if (failures.length) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
