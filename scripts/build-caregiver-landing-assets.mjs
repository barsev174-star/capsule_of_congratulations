import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDir = path.join(root, "public", "landing", "caregiver");
const previewPath = path.join(root, "public", "templates", "kindergarten-doodles", "preview.webp");
const logoPath = path.join(root, "public", "brand", "logo-horizontal.svg");

await mkdir(outputDir, { recursive: true });

const [preview, logo] = await Promise.all([readFile(previewPath), readFile(logoPath)]);
const logoData = `data:image/svg+xml;base64,${logo.toString("base64")}`;

const previewCard = await sharp(preview)
  .resize(480, 304, { fit: "cover" })
  .composite([{
    input: Buffer.from('<svg width="480" height="304"><rect width="480" height="304" rx="28" fill="#ffffff"/></svg>'),
    blend: "dest-in"
  }])
  .png()
  .toBuffer();

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#f7f8fa"/>
  <circle cx="1140" cy="32" r="156" fill="#fff4ef"/>
  <circle cx="500" cy="650" r="118" fill="#edf7ef"/>

  <image href="${logoData}" x="66" y="58" width="208" height="60" preserveAspectRatio="xMinYMid meet"/>
  <rect x="66" y="152" width="62" height="6" rx="3" fill="#e9652f"/>

  <text x="66" y="234" fill="#202124" font-family="Arial, sans-serif" font-size="54" font-weight="750">
    <tspan x="66" dy="0">Групповая открытка</tspan>
    <tspan x="66" dy="68">воспитателю</tspan>
    <tspan x="66" dy="68">от родителей и детей</tspan>
  </text>
  <text x="66" y="488" fill="#5f6368" font-family="Arial, sans-serif" font-size="28" font-weight="400">
    <tspan x="66" dy="0">Слова семей и фотографии группы</tspan>
    <tspan x="66" dy="40">по одной ссылке</tspan>
  </text>

  <g filter="url(#shadow)">
    <rect x="642" y="124" width="516" height="340" rx="38" fill="#ffffff"/>
  </g>
</svg>`;

const overlaySvg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect x="660" y="142" width="480" height="304" rx="28" fill="none" stroke="#000000" stroke-opacity="0.1"/>
  <rect x="704" y="422" width="266" height="52" rx="26" fill="#ffffff"/>
  <text x="728" y="456" fill="#202124" font-family="Arial, sans-serif" font-size="21" font-weight="700">Детство в рисунках</text>
</svg>`;

await sharp(Buffer.from(svg))
  .composite([
    { input: previewCard, left: 660, top: 142 },
    { input: Buffer.from(overlaySvg), left: 0, top: 0 }
  ])
  .webp({ quality: 90 })
  .toFile(path.join(outputDir, "og-kindergarten-doodles.webp"));

console.log("Built public/landing/caregiver/og-kindergarten-doodles.webp");
