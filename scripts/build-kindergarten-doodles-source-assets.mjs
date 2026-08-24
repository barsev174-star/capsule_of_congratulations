import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceRoot = join(root, "template-assets", "kindergarten-doodles", "source");
const source = (name) => join(sourceRoot, name);

await mkdir(sourceRoot, { recursive: true });

const palette = {
  ivory: "#f8f1e8",
  paper: "#fff8ed",
  ink: "#18324c",
  muted: "#617079",
  coral: "#ef7665",
  coralSoft: "#f9d6cf",
  yellow: "#f4c84a",
  yellowSoft: "#fff0b8",
  mint: "#9acfb0",
  mintSoft: "#dff1e7",
  sky: "#75bfe5",
  skySoft: "#dff1fa"
};

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const paperSvg = (width, height, color = palette.ivory) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="paper" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="27" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
      <feComponentTransfer in="mono" result="grain"><feFuncA type="table" tableValues="0 .07"/></feComponentTransfer>
      <feBlend in="SourceGraphic" in2="grain" mode="multiply"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="${color}" filter="url(#paper)"/>
  <path d="M0 ${Math.round(height * .17)}H${width}M0 ${Math.round(height * .74)}H${width}" stroke="#ffffff" stroke-opacity=".22"/>
</svg>`);

const writePage = async () => {
  await sharp(paperSvg(1536, 1024))
    .png({ compressionLevel: 9 })
    .toFile(source("page.png"));
};

const removeLightNeutralBackground = async (input) => {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let index = 0, target = 0; index < data.length; index += 3, target += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const brightness = (r + g + b) / 3;
    let alpha = 255;
    if (chroma <= 5 && brightness >= 238) alpha = 0;
    else if (chroma <= 8 && brightness >= 230) alpha = Math.round((238 - brightness) * 31.875);
    else if (brightness >= 250 && chroma <= 14) alpha = Math.max(40, Math.round(chroma * 16));
    rgba[target] = r;
    rgba[target + 1] = g;
    rgba[target + 2] = b;
    rgba[target + 3] = Math.max(0, Math.min(255, alpha));
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ background: transparent, threshold: 6 })
    .png()
    .toBuffer();
};

const writeCutout = async (input, output, width, height) => {
  const cutout = await removeLightNeutralBackground(input);
  await sharp(cutout)
    .resize(width, height, { fit: "contain", background: transparent })
    .png({ compressionLevel: 9 })
    .toFile(source(output));
};

const writeDoodleAtlas = async () => {
  const atlas = sharp(source("doodle-atlas-master.png"));
  const metadata = await atlas.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Doodle atlas has no dimensions");
  const cellWidth = Math.floor(metadata.width / 2);
  const cellHeight = Math.floor(metadata.height / 2);
  const cells = [
    ["doodle-hearts.png", 0, 0],
    ["doodle-sun.png", cellWidth, 0],
    ["doodle-flower.png", 0, cellHeight],
    ["doodle-rainbow.png", cellWidth, cellHeight]
  ];
  for (const [name, left, top] of cells) {
    const cell = await sharp(source("doodle-atlas-master.png"))
      .extract({ left, top, width: cellWidth, height: cellHeight })
      .png()
      .toBuffer();
    const cutout = await removeLightNeutralBackground(cell);
    await sharp(cutout)
      .resize(600, 600, { fit: "contain", background: transparent })
      .png({ compressionLevel: 9 })
      .toFile(source(name));
  }
};

const panelSvg = ({ width, height, fill, lineColor = palette.sky, variant = "plain" }) => {
  const radius = Math.round(Math.min(width, height) * .035);
  const pattern = variant === "lined"
    ? `<pattern id="rule" width="100" height="44" patternUnits="userSpaceOnUse"><path d="M0 43H100" stroke="${lineColor}" stroke-opacity=".17" stroke-width="2"/></pattern>`
    : variant === "grid"
      ? `<pattern id="rule" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="${lineColor}" stroke-opacity=".12" stroke-width="2"/></pattern>`
      : `<pattern id="rule" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="2" fill="${lineColor}" fill-opacity=".09"/></pattern>`;
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${Math.max(8, Math.round(height * .018))}" stdDeviation="${Math.max(8, Math.round(height * .014))}" flood-color="#000" flood-opacity=".16"/></filter>
      ${pattern}
    </defs>
    <rect x="26" y="22" width="${width - 52}" height="${height - 58}" rx="${radius}" fill="${fill}" filter="url(#shadow)"/>
    <rect x="34" y="30" width="${width - 68}" height="${height - 74}" rx="${Math.max(12, radius - 8)}" fill="url(#rule)"/>
  </svg>`);
};

const resized = async (input, width, height) => sharp(input)
  .resize(width, height, { fit: "contain", background: transparent })
  .png()
  .toBuffer();

const writeSections = async () => {
  await sharp(source("summary-letter-desktop-master-v2.png"))
    .resize(1296, 432, { fit: "fill" })
    .extract({ left: 48, top: 16, width: 1200, height: 400 })
    .png({ compressionLevel: 9 })
    .toFile(source("section-summary-desktop.png"));

  await sharp(source("summary-letter-mobile-master-v2.png"))
    .resize(690, 920, { fit: "fill" })
    .extract({ left: 45, top: 60, width: 600, height: 800 })
    .png({ compressionLevel: 9 })
    .toFile(source("section-summary-mobile.png"));

  await sharp(source("messages-crayon-master-v6.png"))
    .resize(1200, 900, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(source("section-messages.png"));

  await sharp(source("messages-crayon-mobile-master-v2.png"))
    .resize(600, 1000, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(source("section-messages-mobile.png"));

  await sharp(source("memories-pencil-master-v2.png"))
    .resize(1200, 670, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(source("section-memories.png"));

  await sharp(source("memories-pencil-mobile-master-v1.png"))
    .resize(600, 1000, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(source("section-memories-mobile.png"));

  const closing = await removeLightNeutralBackground(source("closing-still-life-master-v3.png"));
  const closingDesktop = await sharp(closing).resize(410, 273, { fit: "contain", background: transparent }).png().toBuffer();
  const closingSun = await resized(source("doodle-sun.png"), 132, 132);
  const closingRainbow = await resized(source("doodle-rainbow.png"), 196, 196);
  await sharp(paperSvg(1200, 480, "#e8f2ef"))
    .composite([
      { input: closingDesktop, left: 0, top: 196 },
      { input: closingSun, left: 1028, top: 224 },
      { input: closingRainbow, left: 986, top: 284 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(source("section-closing-desktop.png"));

  const closingMobile = await sharp(closing).resize(300, 220, { fit: "contain", background: transparent }).png().toBuffer();
  await sharp(paperSvg(600, 800, "#e8f2ef"))
    .composite([
      { input: closingMobile, left: -12, top: 566 },
      { input: await resized(source("doodle-sun.png"), 112, 112), left: 458, top: 82 },
      { input: await resized(source("doodle-rainbow.png"), 150, 150), left: 430, top: 622 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(source("section-closing-mobile.png"));
};

const bindingSvg = (color) => Buffer.from(`<svg width="88" height="410" xmlns="http://www.w3.org/2000/svg">
  <path d="M52 32V378" stroke="${color}" stroke-opacity=".5" stroke-width="5" stroke-dasharray="9 12" stroke-linecap="round"/>
  ${[48, 110, 172, 234, 296, 358].map((y) => `<circle cx="34" cy="${y}" r="10" fill="#fffdf8" stroke="${color}" stroke-opacity=".45" stroke-width="4"/><path d="M34 ${y}C52 ${y - 16} 58 ${y + 16} 70 ${y}" fill="none" stroke="${color}" stroke-opacity=".66" stroke-width="4" stroke-linecap="round"/>`).join("")}
</svg>`);

const mobileBindingSvg = (color) => Buffer.from(`<svg width="72" height="620" xmlns="http://www.w3.org/2000/svg">
  <path d="M44 38V582" stroke="${color}" stroke-opacity=".5" stroke-width="4" stroke-dasharray="8 11" stroke-linecap="round"/>
  ${[58, 154, 250, 346, 442, 538].map((y) => `<circle cx="29" cy="${y}" r="8" fill="#fffdf8" stroke="${color}" stroke-opacity=".45" stroke-width="3"/><path d="M29 ${y}C44 ${y - 13} 51 ${y + 13} 61 ${y}" fill="none" stroke="${color}" stroke-opacity=".66" stroke-width="3" stroke-linecap="round"/>`).join("")}
</svg>`);

const qualityPaperSvg = (width, height, fill, accent, horizontal = false) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#000" flood-opacity=".15"/></filter><pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2" fill="${accent}" fill-opacity=".12"/></pattern></defs>
  <path d="M30 38Q${Math.round(width * .22)} 22 ${Math.round(width * .42)} 34T${width - 30} 30L${width - 22} ${height - 34}Q${Math.round(width * .7)} ${height - 18} ${Math.round(width * .45)} ${height - 30}T26 ${height - 26}Z" fill="${fill}" filter="url(#shadow)"/>
  <path d="M38 48Q${Math.round(width * .4)} 33 ${width - 38} 43L${width - 34} ${height - 45}Q${Math.round(width * .5)} ${height - 29} 38 ${height - 40}Z" fill="url(#dots)"/>
  <rect x="${horizontal ? 82 : Math.round(width * .34)}" y="18" width="${horizontal ? 122 : Math.round(width * .32)}" height="42" rx="5" fill="${accent}" fill-opacity=".68" transform="rotate(${horizontal ? -3 : 2} ${width / 2} 38)"/>
  <path d="M${horizontal ? 176 : 72} ${height - 54}H${width - 54}" stroke="${accent}" stroke-opacity=".32" stroke-width="4" stroke-linecap="round" stroke-dasharray="8 11"/>
</svg>`);

const quotePaperSvg = (fill, accent) => Buffer.from(`<svg width="800" height="640" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000" flood-opacity=".16"/></filter><pattern id="rule" width="90" height="54" patternUnits="userSpaceOnUse"><path d="M0 53H90" stroke="${accent}" stroke-opacity=".12" stroke-width="3"/></pattern></defs>
  <path d="M66 62Q210 38 364 58T734 52L756 566Q608 594 448 578T62 592L46 98Z" fill="${fill}" filter="url(#shadow)"/>
  <path d="M82 90Q350 66 720 82L732 548Q404 566 84 558Z" fill="url(#rule)"/>
  <path d="M44 152L164 126L178 526L54 554Z" fill="${accent}" fill-opacity=".19"/>
  <rect x="312" y="34" width="176" height="56" rx="6" fill="${accent}" fill-opacity=".7" transform="rotate(-2 400 62)"/>
  <circle cx="112" cy="182" r="9" fill="#fffdf8" stroke="${accent}" stroke-opacity=".55" stroke-width="5"/>
  <circle cx="112" cy="490" r="9" fill="#fffdf8" stroke="${accent}" stroke-opacity=".55" stroke-width="5"/>
</svg>`);

const writeCards = async () => {
  const cardTones = ["#fff7dc", "#eaf5e8", "#fde8ea", "#e3f2f8"];
  const doodles = ["doodle-hearts.png", "doodle-flower.png", "doodle-sun.png", "doodle-rainbow.png"];
  const clips = [palette.coral, palette.mint, palette.sky, palette.yellow];
  for (let index = 0; index < 4; index += 1) {
    const doodle = await resized(source(doodles[index]), 130, 130);
    await sharp({ create: { width: 1200, height: 500, channels: 4, background: transparent } })
      .composite([
        { input: panelSvg({ width: 1170, height: 470, fill: cardTones[index], lineColor: clips[index], variant: index % 2 === 0 ? "lined" : "grid" }), left: 15, top: 5 },
        { input: bindingSvg(clips[index]), left: 32, top: 38 },
        { input: Buffer.from(`<svg width="190" height="70" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="12" width="174" height="42" rx="5" fill="${clips[index]}" fill-opacity=".58" transform="rotate(${index % 2 ? 2 : -2} 95 35)"/></svg>`), left: 450 + index * 16, top: 0 },
        { input: doodle, left: 1015, top: 328 }
      ])
      .png({ compressionLevel: 9 })
      .toFile(source(`greeting-card-${index + 1}.png`));

    await sharp({ create: { width: 600, height: 700, channels: 4, background: transparent } })
      .composite([
        { input: panelSvg({ width: 570, height: 670, fill: cardTones[index], lineColor: clips[index], variant: index % 2 === 0 ? "lined" : "grid" }), left: 15, top: 8 },
        { input: mobileBindingSvg(clips[index]), left: 22, top: 40 },
        { input: Buffer.from(`<svg width="150" height="62" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="10" width="136" height="38" rx="5" fill="${clips[index]}" fill-opacity=".58" transform="rotate(${index % 2 ? 2 : -2} 75 31)"/></svg>`), left: 225 + index * 8, top: 1 },
        { input: await resized(source(doodles[index]), 104, 104), left: 462, top: 566 }
      ])
      .png({ compressionLevel: 9 })
      .toFile(source(`greeting-card-mobile-${index + 1}.png`));
  }

  const qualityTones = ["#fff0bd", "#e2f1df", "#f9dfe4", "#dff1fa", "#e8e4f7"];
  const qualityDoodles = ["doodle-hearts.png", "doodle-flower.png", "doodle-sun.png", "doodle-rainbow.png", "doodle-book-v3.png"];
  for (let index = 0; index < 5; index += 1) {
    const icon = await resized(source(qualityDoodles[index]), 126, 126);
    await sharp({ create: { width: 480, height: 330, channels: 4, background: transparent } })
      .composite([
        { input: qualityPaperSvg(480, 330, qualityTones[index], clips[index % 4]), left: 0, top: 0 },
        { input: icon, left: 177, top: 64 }
      ])
      .png({ compressionLevel: 9 })
      .toFile(source(`quality-card-${index + 1}.png`));

    await sharp({ create: { width: 720, height: 180, channels: 4, background: transparent } })
      .composite([
        { input: qualityPaperSvg(720, 180, qualityTones[index], clips[index % 4], true), left: 0, top: 0 },
        { input: await resized(source(qualityDoodles[index]), 108, 108), left: 48, top: 42 }
      ])
      .png({ compressionLevel: 9 })
      .toFile(source(`quality-card-${index + 1}-export.png`));
  }

  const quoteTones = ["#fff7dc", "#e8f4ec", "#e6f3fa"];
  const quoteDoodles = ["doodle-kite-v3.png", "doodle-paper-boat-v3.png", "doodle-blocks-v3.png"];
  for (let index = 0; index < 3; index += 1) {
    const doodle = await resized(source(quoteDoodles[index]), 150, 150);
    await sharp({ create: { width: 800, height: 640, channels: 4, background: transparent } })
      .composite([
        { input: quotePaperSvg(quoteTones[index], clips[index]), left: 0, top: 0 },
        { input: doodle, left: 38, top: 286 }
      ])
      .png({ compressionLevel: 9 })
      .toFile(source(`quote-card-${index + 1}.png`));

  }
};

const frameSvg = (width, height, aperture, captionArea, tone) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  const captionY = Math.round(height * captionArea.y);
  const captionH = Math.round(height * captionArea.height);
  const edge = Math.round(Math.min(width, height) * .022);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${Math.round(height * .018)}" stdDeviation="${Math.round(height * .014)}" flood-color="#000" flood-opacity=".2"/></filter><pattern id="paper" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="9" cy="12" r="2" fill="${palette.sky}" fill-opacity=".08"/><path d="M3 39L24 37" stroke="${palette.coral}" stroke-opacity=".06" stroke-width="2"/></pattern></defs>
    <path d="M${edge} ${edge * 1.4}Q${Math.round(width * .24)} ${edge * .55} ${Math.round(width * .46)} ${edge * 1.15}T${width - edge} ${edge}L${width - edge * .7} ${height - edge * 1.25}Q${Math.round(width * .72)} ${height - edge * .4} ${Math.round(width * .48)} ${height - edge * 1.05}T${edge * .8} ${height - edge * .7}Z" fill="${tone}" filter="url(#shadow)"/>
    <path d="M${edge * 1.5} ${edge * 1.8}H${width - edge * 1.5}V${height - edge * 1.8}H${edge * 1.5}Z" fill="url(#paper)"/>
    <rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="10" fill="#fff" stroke="#000" stroke-opacity=".1" stroke-width="3"/>
    <path d="M${Math.round(width * captionArea.x)} ${captionY + captionH - Math.round(height * .02)}H${Math.round(width * (captionArea.x + captionArea.width))}" stroke="${palette.sky}" stroke-opacity=".24" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 12"/>
  </svg>`);
};

const frameOverlaySvg = (width, height, aperture) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  const corner = Math.round(Math.min(width, height) * .055);
  const tapeW = Math.round(width * .2);
  const tapeH = Math.round(height * .045);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fffdf8" fill-opacity=".94" stroke="#000" stroke-opacity=".08" stroke-width="2">
      <path d="M${x} ${y}H${x + corner}L${x} ${y + corner}Z"/>
      <path d="M${x + w} ${y}H${x + w - corner}L${x + w} ${y + corner}Z"/>
      <path d="M${x} ${y + h}H${x + corner}L${x} ${y + h - corner}Z"/>
      <path d="M${x + w} ${y + h}H${x + w - corner}L${x + w} ${y + h - corner}Z"/>
    </g>
    <g fill="${palette.yellowSoft}" fill-opacity=".88" stroke="#fff" stroke-opacity=".55">
      <rect x="${Math.round(width * .4)}" y="${Math.max(2, y - tapeH * .65)}" width="${tapeW}" height="${tapeH}" rx="6" transform="rotate(-3 ${width / 2} ${y})"/>
    </g>
  </svg>`);
};

const writeFrames = async () => {
  const portraitAperture = { x: .08, y: .05, width: .84, height: .76 };
  const portraitCaption = { x: .08, y: .83, width: .84, height: .11 };
  const landscapeAperture = { x: .08, y: .07, width: .84, height: .70 };
  const landscapeCaption = { x: .08, y: .80, width: .84, height: .14 };
  await sharp(frameSvg(802, 1122, portraitAperture, portraitCaption, palette.paper)).png({ compressionLevel: 9 }).toFile(source("photo-frame-portrait-base.png"));
  await sharp(frameOverlaySvg(802, 1122, portraitAperture)).png({ compressionLevel: 9 }).toFile(source("photo-frame-portrait-overlay.png"));
  await sharp(frameSvg(1122, 802, landscapeAperture, landscapeCaption, palette.paper)).png({ compressionLevel: 9 }).toFile(source("photo-frame-landscape-base.png"));
  await sharp(frameOverlaySvg(1122, 802, landscapeAperture)).png({ compressionLevel: 9 }).toFile(source("photo-frame-landscape-overlay.png"));
};

const writeHeroAndPreview = async () => {
  await writeCutout(source("hero-drawing-vertical-master-v5.png"), "decor-hero-drawing-v5.png", 720, 1080);
  await writeCutout(source("hero-still-life-master.png"), "decor-hero-still-life.png", 720, 900);
  await writeCutout(source("closing-still-life-master-v3.png"), "decor-closing-still-life.png", 960, 640);

  const background = await sharp(source("page.png")).resize(1200, 630, { fit: "cover" }).png().toBuffer();
  const left = await sharp(source("decor-hero-drawing-v5.png")).resize(310, 510, { fit: "contain", background: transparent }).rotate(-2, { background: transparent }).png().toBuffer();
  const right = await sharp(source("decor-hero-still-life.png")).resize(390, 488, { fit: "contain", background: transparent }).png().toBuffer();
  const center = Buffer.from(`<svg width="500" height="370" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="20" width="480" height="320" rx="52" fill="#fff8ed" fill-opacity=".94"/><path d="M120 288H380" stroke="${palette.coral}" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/><circle cx="250" cy="124" r="18" fill="${palette.coralSoft}"/><path d="M236 124c0-18 24-22 28-5 4-17 28-13 28 5 0 18-28 34-28 34s-28-16-28-34Z" fill="${palette.coral}" fill-opacity=".76"/></svg>`);
  await sharp(background)
    .composite([
      { input: left, left: 12, top: 58 },
      { input: center, left: 350, top: 120 },
      { input: right, left: 835, top: 65 }
    ])
    .png({ compressionLevel: 9 })
    .toFile(source("catalog-preview.png"));
};

await writePage();
await writeDoodleAtlas();
await writeSections();
await writeCards();
await writeFrames();
await writeHeroAndPreview();

console.log("KINDERGARTEN_DOODLES_SOURCE_ASSETS_BUILT_V1");
