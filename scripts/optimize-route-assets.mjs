import { readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const cssPath = join(projectRoot, "src", "components", "final-card", "final-card.module.css");
const assetDir = join(projectRoot, "public", "templates", "route-adventure");
const css = await readFile(cssPath, "utf8");
const assetNames = [...new Set(
  [...css.matchAll(/\/templates\/route-adventure\/([^"')]+)\.(?:webp|png)/g)].map((match) => `${match[1]}.png`)
)];

let sourceBytes = 0;
let outputBytes = 0;
let decodedBytes = 0;

for (const name of assetNames) {
  const inputPath = join(assetDir, name);
  const outputPath = join(assetDir, name.replace(/\.png$/i, ".webp"));
  const sourceFile = await stat(inputPath);
  const image = sharp(inputPath, { limitInputPixels: false });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read dimensions for ${name}`);

  const width = Math.max(1, Math.round(metadata.width * 0.67));
  const height = Math.max(1, Math.round(metadata.height * 0.67));
  const info = await image
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 82, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(outputPath);

  sourceBytes += sourceFile.size;
  outputBytes += info.size;
  decodedBytes += info.width * info.height * 4;
  console.log(`${basename(outputPath)} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} KiB`);
}

console.log(`Route assets: ${(sourceBytes / 1024 / 1024).toFixed(1)} MiB PNG -> ${(outputBytes / 1024 / 1024).toFixed(1)} MiB WebP`);
console.log(`Estimated decoded memory: ${(decodedBytes / 1024 / 1024).toFixed(1)} MiB`);
