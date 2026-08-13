import { join } from "node:path";
import sharp from "sharp";

const sourceDir = join(process.cwd(), "template-assets", "northern-light", "source");
const source = (name) => join(sourceDir, name);

const qualityCard = `
<svg width="480" height="258" viewBox="0 0 480 258" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#263b7a"/><stop offset="0.5" stop-color="#6a5cff"/><stop offset="1" stop-color="#20c7c9"/></linearGradient></defs>
  <rect x="6" y="6" width="468" height="246" rx="42" fill="url(#g)" stroke="#dce8ff" stroke-width="6"/>
  <path d="M22 174 C118 112 168 222 264 154 S404 86 462 120" fill="none" stroke="#ff7a59" stroke-width="9" opacity=".72"/>
  <circle cx="402" cy="55" r="5" fill="#ffffff"/><circle cx="429" cy="76" r="3" fill="#ffffff" opacity=".7"/><circle cx="67" cy="58" r="4" fill="#ffffff" opacity=".8"/>
</svg>`;

const quoteCard = `
<svg width="1402" height="1122" viewBox="0 0 1402 1122" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="q" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172655"/><stop offset="0.56" stop-color="#332c74"/><stop offset="1" stop-color="#165b78"/></linearGradient></defs>
  <rect x="18" y="18" width="1366" height="1086" rx="92" fill="url(#q)" stroke="#dce8ff" stroke-width="18"/>
  <path d="M48 820 C292 652 438 928 684 742 S1088 516 1354 644" fill="none" stroke="#20c7c9" stroke-width="34" opacity=".45"/>
  <path d="M60 892 C304 724 462 1008 716 804 S1116 596 1340 720" fill="none" stroke="#ff7a59" stroke-width="20" opacity=".58"/>
  <g fill="#ffffff" opacity=".76"><circle cx="188" cy="180" r="9"/><circle cx="248" cy="134" r="5"/><circle cx="1198" cy="208" r="8"/><circle cx="1262" cy="166" r="4"/></g>
</svg>`;

const frameSvg = (width, height, overlay = false) => {
  const radius = Math.round(Math.min(width, height) * .075);
  const border = Math.round(Math.min(width, height) * .026);
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${overlay
      ? `<rect x="${border}" y="${border}" width="${width - border * 2}" height="${height - border * 2}" rx="${radius}" fill="none" stroke="#dce8ff" stroke-width="${border}"/><path d="M${border * 2} ${height - border * 3} C${Math.round(width * .28)} ${Math.round(height * .78)} ${Math.round(width * .62)} ${Math.round(height * .96)} ${width - border * 2} ${Math.round(height * .8)}" fill="none" stroke="#20c7c9" stroke-width="${Math.max(8, Math.round(border * .6))}" opacity=".8"/><circle cx="${width - border * 3}" cy="${border * 3}" r="${Math.max(5, Math.round(border * .35))}" fill="#ff7a59"/>`
      : `<rect x="${border}" y="${border}" width="${width - border * 2}" height="${height - border * 2}" rx="${radius}" fill="#f7f9ff" fill-opacity=".94"/>`}
  </svg>`;
};

await Promise.all([
  sharp(source("page.png")).resize(1376, 768, { fit: "cover", position: "centre" }).png().toFile(source("hero.png")),
  sharp(Buffer.from(qualityCard)).png().toFile(source("quality-card.png")),
  sharp(Buffer.from(quoteCard)).png().toFile(source("quote-card.png")),
  sharp(Buffer.from(frameSvg(802, 1122))).png().toFile(source("photo-frame-portrait-base.png")),
  sharp(Buffer.from(frameSvg(802, 1122, true))).png().toFile(source("photo-frame-portrait-overlay.png")),
  sharp(Buffer.from(frameSvg(1122, 802))).png().toFile(source("photo-frame-landscape-base.png")),
  sharp(Buffer.from(frameSvg(1122, 802, true))).png().toFile(source("photo-frame-landscape-overlay.png"))
]);

console.log("NORTHERN_LIGHT_SOURCE_ASSETS_READY");
