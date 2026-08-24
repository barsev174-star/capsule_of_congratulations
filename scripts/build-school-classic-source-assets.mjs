import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceRoot = join(root, "template-assets", "school-classic", "source");
const source = (name) => join(sourceRoot, name);

await mkdir(sourceRoot, { recursive: true });

const palette = {
  ivory: "#fffaf0",
  navy: "#18324c",
  gold: "#b58a3a",
  goldLight: "#f0d98e"
};

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const pageMaster = source("page-master-v1.png");

const writeOpaque = async (input, output, width, height, options = {}) => {
  await sharp(input)
    .resize(width, height, {
      fit: options.fit ?? "cover",
      position: options.position ?? "center",
      background: options.background ?? palette.ivory
    })
    .png({ compressionLevel: 9 })
    .toFile(source(output));
};

const writePageBackground = async () => {
  const cleanPaperPatch = await sharp(pageMaster)
    .extract({ left: 800, top: 90, width: 420, height: 70 })
    .png()
    .toBuffer();

  await sharp(pageMaster)
    .composite([{ input: cleanPaperPatch, left: 800, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(source("page-v2.png"));
};

const writeMemoriesUnderlay = async () => {
  const album = await sharp(source("memories-album-master-v3.png"))
    .resize(1200, 670, { fit: "cover", position: "center" })
    .png()
    .toBuffer();
  const paperTexture = await sharp(album)
    .extract({ left: 350, top: 170, width: 500, height: 160 })
    .resize(1020, 160, { fit: "fill" })
    .png()
    .toBuffer();
  const paperEdge = await sharp(album)
    .extract({ left: 100, top: 330, width: 1030, height: 50 })
    .png()
    .toBuffer();

  await sharp(album)
    .composite([
      { input: paperTexture, left: 105, top: 320 },
      { input: paperEdge, left: 100, top: 470 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(source("section-memories-v10.png"));
};

const writeNormalizedCrop = async (input, output, width, height, crop) => {
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read dimensions for ${input}`);
  const left = Math.round(metadata.width * crop.x);
  const top = Math.round(metadata.height * crop.y);
  const cropWidth = Math.min(metadata.width - left, Math.round(metadata.width * crop.width));
  const cropHeight = Math.min(metadata.height - top, Math.round(metadata.height * crop.height));
  await sharp(input)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(source(output));
};

const trimmed = async (input) => sharp(input)
  .trim({ background: transparent, threshold: 4 })
  .png()
  .toBuffer();

const writeTransparent = async (input, output, width, height, fit = "fill") => {
  const object = await trimmed(input);
  await sharp(object)
    .resize(width, height, { fit, background: transparent })
    .png({ compressionLevel: 9 })
    .toFile(source(output));
};

const writeHeroBoard = async () => {
  const board = await sharp(await trimmed(source("decor-hero-left-master-v4.png")))
    .resize(720, 900, { fit: "contain", background: transparent })
    .png()
    .toBuffer();
  const desktopChalkLettering = Buffer.from(`<svg width="720" height="900" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="chalk" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="1" seed="9" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale=".7"/>
      </filter>
    </defs>
    <g fill="#f7f2e1" fill-opacity=".94" text-anchor="middle" font-family="Caveat, 'Segoe Print', cursive" font-size="42" font-weight="600" filter="url(#chalk)">
      <text x="360" y="332">Спасибо за знания,</text>
      <text x="360" y="390">терпение и поддержку!</text>
    </g>
    <path d="M360 488 C338 456 292 474 303 512 C312 542 346 558 360 573 C374 558 408 542 417 512 C428 474 382 456 360 488Z" fill="none" stroke="#f7f2e1" stroke-opacity=".92" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk)"/>
  </svg>`);
  const mobileChalkLettering = Buffer.from(`<svg width="720" height="900" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="chalk" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="1" seed="9" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale=".7"/>
      </filter>
    </defs>
    <g fill="#f7f2e1" fill-opacity=".94" text-anchor="middle" font-family="Caveat, 'Segoe Print', cursive" font-size="42" font-weight="600" filter="url(#chalk)">
      <text x="430" y="304">Спасибо за знания,</text>
      <text x="430" y="360">терпение</text>
      <text x="430" y="416">и поддержку!</text>
    </g>
    <path d="M360 504 C338 472 292 490 303 528 C312 558 346 574 360 589 C374 574 408 558 417 528 C428 490 382 472 360 504Z" fill="none" stroke="#f7f2e1" stroke-opacity=".92" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk)"/>
  </svg>`);
  await sharp(board)
    .composite([{ input: desktopChalkLettering, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(source("decor-hero-left-v4.png"));
  await sharp(board)
    .composite([{ input: mobileChalkLettering, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(source("decor-hero-left-mobile-v6.png"));
};

const frameBaseSvg = (width, height, aperture, captionArea) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  const cy = Math.round(height * captionArea.y);
  const ch = Math.round(height * captionArea.height);
  const radius = Math.max(18, Math.round(Math.min(width, height) * .026));
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${Math.round(height * .014)}" stdDeviation="${Math.round(height * .012)}" flood-color="#000" flood-opacity=".22"/></filter>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#76531a"/><stop offset=".26" stop-color="#e2bd62"/><stop offset=".5" stop-color="#fff0ad"/><stop offset=".72" stop-color="#b6842d"/><stop offset="1" stop-color="#6f4c17"/></linearGradient>
      <pattern id="captionFiber" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M0 27H28" stroke="${palette.navy}" stroke-opacity=".055"/></pattern>
    </defs>
    <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="${radius}" fill="${palette.ivory}" stroke="#fff" stroke-opacity=".8" stroke-width="3" filter="url(#shadow)"/>
    <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="${Math.max(12, radius - 8)}" fill="none" stroke="url(#gold)" stroke-width="5"/>
    <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="12" fill="none" stroke="url(#gold)" stroke-width="5"/>
    <rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="8" fill="none" stroke="${palette.navy}" stroke-opacity=".35" stroke-width="3"/>
    <rect x="${Math.round(width * captionArea.x)}" y="${cy}" width="${Math.round(width * captionArea.width)}" height="${ch}" rx="10" fill="url(#captionFiber)"/>
    <path d="M${Math.round(width * .1)} ${cy - 8}H${Math.round(width * .9)}" stroke="${palette.gold}" stroke-opacity=".62" stroke-width="3"/>
  </svg>`;
};

const writeFrame = async (name, width, height, aperture, captionArea) => {
  await sharp(Buffer.from(frameBaseSvg(width, height, aperture, captionArea)))
    .png({ compressionLevel: 9 })
    .toFile(source(`${name}-base.png`));
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  const size = Math.round(Math.min(width, height) * .2);
  const corner = await sharp(await trimmed(source("photo-corner-brass-master-v2.png")))
    .resize(size, size, { fit: "contain", background: transparent })
    .png()
    .toBuffer();
  const topRight = await sharp(corner).flop().png().toBuffer();
  const bottomLeft = await sharp(corner).flip().png().toBuffer();
  const bottomRight = await sharp(corner).flip().flop().png().toBuffer();
  await sharp({ create: { width, height, channels: 4, background: transparent } })
    .composite([
      { input: corner, left: x - 10, top: y - 10 },
      { input: topRight, left: x + w - size + 10, top: y - 10 },
      { input: bottomLeft, left: x - 10, top: y + h - size + 10 },
      { input: bottomRight, left: x + w - size + 10, top: y + h - size + 10 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(source(`${name}-overlay.png`));
};

await writePageBackground();
await writeNormalizedCrop(source("summary-letter-desktop-master-v5.png"), "section-summary-desktop-v5.png", 1200, 360, { x: 0, y: 0.1, width: 1, height: 0.64 });
await writeOpaque(source("summary-letter-mobile-master-v4.png"), "section-summary-mobile-v5.png", 600, 800);
await writeOpaque(source("messages-ledger-master-v2.png"), "section-messages-v2.png", 1200, 900);
await writeMemoriesUnderlay();
await writeOpaque(source("closing-desk-desktop-master-v4.png"), "section-closing-desktop-v4.png", 1200, 480);
await writeOpaque(source("closing-desk-mobile-master-v4.png"), "section-closing-mobile-v5.png", 600, 800);

for (let index = 1; index <= 4; index += 1) {
  await writeTransparent(source(`greeting-card-${index}-master-v4.png`), `greeting-card-${index}-v4.png`, 1200, 500);
}

for (let index = 1; index <= 5; index += 1) {
  const master = source(`quality-card-${index}-master-v3.png`);
  await writeTransparent(master, `quality-card-${index}-v3.png`, 480, 258);
  await writeTransparent(master, `quality-card-${index}-export-v3.png`, 720, 180);
}

for (let index = 1; index <= 3; index += 1) {
  await writeTransparent(source(`quote-card-${index}-master-v4.png`), `quote-card-${index}-v4.png`, 800, 640);
}

await writeHeroBoard();
await writeTransparent(source("decor-hero-right-master-v3.png"), "decor-hero-right-v3.png", 720, 900, "contain");

await writeFrame(
  "photo-frame-portrait-v2",
  802,
  1122,
  { x: .08, y: .05, width: .84, height: .76 },
  { x: .08, y: .83, width: .84, height: .11 }
);
await writeFrame(
  "photo-frame-landscape-v2",
  1122,
  802,
  { x: .08, y: .07, width: .84, height: .70 },
  { x: .08, y: .80, width: .84, height: .14 }
);

const previewBackground = await sharp(source("page-v2.png")).resize(1200, 630, { fit: "cover" }).png().toBuffer();
const heroLeft = await sharp(await trimmed(source("decor-hero-left-master-v4.png"))).resize(330, 413, { fit: "contain", background: transparent }).png().toBuffer();
const heroRight = await sharp(source("decor-hero-right-v3.png")).resize(330, 413, { fit: "contain", background: transparent }).png().toBuffer();
await sharp(previewBackground).composite([
  { input: heroLeft, left: 250, top: 108 },
  { input: heroRight, left: 620, top: 108 }
]).png({ compressionLevel: 9 }).toFile(source("catalog-preview-v3.png"));

console.log("SCHOOL_CLASSIC_SOURCE_ASSETS_BUILT_V14");
