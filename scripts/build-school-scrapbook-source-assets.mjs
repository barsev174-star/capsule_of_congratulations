import { join } from "node:path";
import sharp from "sharp";

const outputRoot = join(process.cwd(), "template-assets", "school-scrapbook", "source");
const pageMaster = join(outputRoot, "page-master.png");
const sectionSurfaceMaster = join(outputRoot, "section-surface-master-v2.png");
const frameAtlas = join(outputRoot, "frame-art-atlas.png");
const heroCardMaster = join(outputRoot, "hero-card-master.png");

const colors = {
  cream: "#fffaf0",
  blue: "#1859bd",
  turquoise: "#29aeb1",
  orange: "#ef6b39",
  yellow: "#f4c43d",
  green: "#5c9d58"
};

const variantBuffer = async (source, width, height, index) => {
  let pipeline = sharp(source);
  if (index % 2 === 1) pipeline = pipeline.flop();
  if (index % 3 === 2) pipeline = pipeline.flip();
  if (index % 5 === 4) pipeline = pipeline.rotate(180);
  return pipeline.resize(width, height, {
    fit: "cover",
    position: ["north", "center", "south"][index % 3]
  }).png().toBuffer();
};

const roundedMaskSvg = (width, height, radius, inset = 8) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${radius}" fill="#fff"/>
  </svg>`;

const quietCenterSvg = (width, height, insetX, insetY, radius, opacity = .94) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Math.round(width * insetX)}" y="${Math.round(height * insetY)}"
      width="${Math.round(width * (1 - insetX * 2))}" height="${Math.round(height * (1 - insetY * 2))}"
      rx="${radius}" fill="${colors.cream}" fill-opacity="${opacity}"/>
  </svg>`;

const tintSvg = (width, height, color, opacity) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${color}" fill-opacity="${opacity}"/>
  </svg>`;

const writeFramedHero = async ({
  name,
  source,
  width,
  height,
  index,
  insetX = .065,
  insetY = .095,
  radius = 34,
  centerOpacity = .94
}) => {
  const art = await variantBuffer(source, width, height, index);
  await sharp(art)
    .composite([
      { input: Buffer.from(quietCenterSvg(width, height, insetX, insetY, radius, centerOpacity)) },
      { input: Buffer.from(roundedMaskSvg(width, height, radius)), blend: "dest-in" }
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const writeFullBleedPaper = async ({ name, source, width, height, index, tint, tintOpacity = .18 }) => {
  const art = await variantBuffer(source, width, height, index);
  const composites = tint
    ? [{ input: Buffer.from(tintSvg(width, height, tint, tintOpacity)), blend: "over" }]
    : [];

  await sharp(art)
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const writeNotebookMessagePaper = async ({ name, source }) => {
  await sharp(source)
    .resize(1200, 400, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const writeSizedCard = async ({ name, source, width, height }) => {
  await sharp(source)
    .resize(width, height, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const writeCoverCard = async ({ name, source, width, height }) => {
  await sharp(source)
    .resize(width, height, { fit: "cover", position: "center" })
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const writeEdgeExtendedCard = async ({ name, source, width, height }) => {
  const metadata = await sharp(source).metadata();
  const scale = Math.min(width / metadata.width, height / metadata.height);
  const innerWidth = Math.max(1, Math.round(metadata.width * scale));
  const innerHeight = Math.max(1, Math.round(metadata.height * scale));
  const top = Math.floor((height - innerHeight) / 2);
  const tileSourceWidth = Math.min(metadata.width, Math.round(metadata.height * .55));
  const tileSourceHeight = Math.min(metadata.height, Math.round(metadata.height * .45));
  const tileLeft = Math.floor((metadata.width - tileSourceWidth) / 2);
  const tileTop = Math.floor((metadata.height - tileSourceHeight) / 2);
  const paperTile = await sharp(source)
    .extract({ left: tileLeft, top: tileTop, width: tileSourceWidth, height: tileSourceHeight })
    .resize(Math.max(1, Math.round(tileSourceWidth * scale)), Math.max(1, Math.round(tileSourceHeight * scale)), { fit: "fill" })
    .png()
    .toBuffer();
  const background = await sharp({
    create: { width, height, channels: 3, background: { r: 218, g: 242, b: 231 } }
  })
    .composite([{ input: paperTile, tile: true }])
    .png()
    .toBuffer();
  const art = await sharp(source)
    .resize(innerWidth, innerHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const leftWidth = Math.floor(innerWidth / 2);
  const rightWidth = innerWidth - leftWidth;
  const sideInset = Math.round(width * .062);
  const rightLeft = width - sideInset - rightWidth;
  const gapLeft = sideInset + leftWidth;
  const gapWidth = rightLeft - gapLeft;
  const bridgeHeight = Math.max(1, Math.round(height * .11));
  const bridgeSampleWidth = Math.min(4, innerWidth);
  const bridgeLeft = Math.max(0, leftWidth - Math.ceil(bridgeSampleWidth / 2));
  const leftArt = await sharp(art)
    .extract({ left: 0, top: 0, width: leftWidth, height: innerHeight })
    .png()
    .toBuffer();
  const rightArt = await sharp(art)
    .extract({ left: leftWidth, top: 0, width: rightWidth, height: innerHeight })
    .png()
    .toBuffer();
  const topBridge = await sharp(art)
    .extract({ left: bridgeLeft, top: 0, width: bridgeSampleWidth, height: bridgeHeight })
    .resize(gapWidth, bridgeHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const bottomBridge = await sharp(art)
    .extract({ left: bridgeLeft, top: innerHeight - bridgeHeight, width: bridgeSampleWidth, height: bridgeHeight })
    .resize(gapWidth, bridgeHeight, { fit: "fill" })
    .png()
    .toBuffer();

  await sharp(background)
    .composite([
      { input: leftArt, left: sideInset, top },
      { input: rightArt, left: rightLeft, top },
      { input: topBridge, left: gapLeft, top },
      { input: bottomBridge, left: gapLeft, top: top + innerHeight - bridgeHeight }
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const frameOverlaySvg = ({ width, height, aperture, radius }) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  const accentStroke = Math.max(5, Math.round(width * .006));
  const paperStroke = accentStroke * 2;
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="${radius}" fill="none" stroke="${colors.blue}" stroke-width="${accentStroke}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(radius * .35)}" fill="none" stroke="${colors.cream}" stroke-width="${paperStroke}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(radius * .35)}" fill="none" stroke="${colors.turquoise}" stroke-width="${accentStroke}"/>
      <path d="M ${Math.round(width * .12)} ${Math.round(height * .955)} C ${Math.round(width * .32)} ${Math.round(height * .92)}, ${Math.round(width * .64)} ${Math.round(height * .985)}, ${Math.round(width * .88)} ${Math.round(height * .93)}" fill="none" stroke="${colors.orange}" stroke-width="${accentStroke}" stroke-linecap="round"/>
      <circle cx="${Math.round(width * .91)}" cy="${Math.round(height * .055)}" r="${Math.max(7, Math.round(width * .012))}" fill="${colors.yellow}"/>
      <circle cx="${Math.round(width * .86)}" cy="${Math.round(height * .055)}" r="${Math.max(5, Math.round(width * .008))}" fill="${colors.green}"/>
    </svg>`;
};

const captionPanelSvg = (width, height, captionArea, color) => {
  const x = Math.round(width * captionArea.x);
  const y = Math.round(height * captionArea.y);
  const w = Math.round(width * captionArea.width);
  const h = Math.round(height * captionArea.height);
  const gridSize = Math.max(12, Math.round(height * .025));
  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="caption-grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${colors.blue}" stroke-opacity=".12" stroke-width="1"/>
      </pattern>
    </defs>
    <rect x="${x}" y="${y}" width="${w}" height="${h}"
      rx="${Math.max(12, Math.round(height * .018))}" fill="${color}" fill-opacity=".9"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}"
      rx="${Math.max(12, Math.round(height * .018))}" fill="url(#caption-grid)"/>
  </svg>`;
};

const writeFrame = async ({ name, width, height, aperture, captionArea, captionColor, radius, index }) => {
  const art = await variantBuffer(frameAtlas, width, height, index);
  await sharp(art)
    .composite([
      { input: Buffer.from(captionPanelSvg(width, height, captionArea, captionColor)) },
      { input: Buffer.from(roundedMaskSvg(width, height, radius, 10)), blend: "dest-in" }
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}-base.png`));

  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(frameOverlaySvg({ width, height, aperture, radius })) }])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}-overlay.png`));
};

await sharp(pageMaster)
  .resize(1536, 1024, { fit: "cover", position: "center" })
  .png({ compressionLevel: 9 })
  .toFile(join(outputRoot, "page.png"));

const sectionSurfaces = [
  { name: "qualities", tint: "#fff0b8" },
  { name: "memories", tint: "#dff2e3" },
  { name: "quotes", tint: "#eee4fa" }
];

const responsiveSectionSurfaces = [
  { name: "section-summary-featured-desktop-v3", source: "section-summary-featured-desktop-v3-master.png", width: 1200, height: 360, mode: "extend" },
  { name: "section-summary-featured-mobile-v3", source: "section-summary-featured-mobile-v3-master.png", width: 600, height: 800, mode: "cover" },
  { name: "section-messages-doodles-desktop-v3", source: "section-messages-doodles-v2-master.png", width: 1200, height: 900, mode: "cover" },
  { name: "section-messages-doodles-mobile-v3", source: "section-messages-doodles-v2-master.png", width: 600, height: 1000, mode: "cover" },
  { name: "section-closing-finale-desktop-v3", source: "section-closing-finale-desktop-v3-master.png", width: 1200, height: 480, mode: "cover" },
  { name: "section-closing-finale-mobile-v3", source: "section-closing-finale-mobile-v3-master.png", width: 600, height: 800, mode: "cover" }
];

const greetingCards = [
  "notebook-message-yellow-v4.png",
  "notebook-message-turquoise-v4.png",
  "notebook-message-mint-v4.png",
  "notebook-message-lilac-v4.png"
];
const qualityCards = [
  "quality-card-1-v2-master.png",
  "quality-card-2-v2-master.png",
  "quality-card-3-v2-master.png",
  "quality-card-4-v2-master.png",
  "quality-card-5-v2-master.png"
];

await Promise.all([
  writeFramedHero({
    name: "section-hero",
    source: heroCardMaster,
    width: 1200,
    height: 670,
    index: 0,
    insetX: .075,
    insetY: .11,
    centerOpacity: .9
  }),
  ...sectionSurfaces.map(({ name, tint }, index) => writeFullBleedPaper({
    name: `section-${name}`,
    source: sectionSurfaceMaster,
    width: 1200,
    height: 670,
    index,
    tint,
    tintOpacity: .1
  })),
  ...responsiveSectionSurfaces.map(({ name, source, width, height, mode }) => (mode === "extend" ? writeEdgeExtendedCard : writeCoverCard)({
    name,
    source: join(outputRoot, source),
    width,
    height
  })),
  ...greetingCards.map((source, index) => writeNotebookMessagePaper({
    name: `greeting-card-${index + 1}-v3`,
    source: join(outputRoot, source)
  })),
  ...qualityCards.map((source, index) => writeSizedCard({
    name: `quality-card-${index + 1}-v2`,
    source: join(outputRoot, source),
    width: 480,
    height: 258
  })),
  writeSizedCard({
    name: "quote-card-v3",
    source: join(outputRoot, "quote-card-decorative-v3-master.png"),
    width: 800,
    height: 640
  }),
  writeFrame({
    name: "photo-frame-portrait-v3",
    width: 802,
    height: 1122,
    aperture: { x: .08, y: .05, width: .84, height: .76 },
    captionArea: { x: .08, y: .83, width: .84, height: .11 },
    captionColor: "#fff1c9",
    radius: 34,
    index: 0
  }),
  writeFrame({
    name: "photo-frame-landscape-v3",
    width: 1122,
    height: 802,
    aperture: { x: .08, y: .07, width: .84, height: .70 },
    captionArea: { x: .08, y: .80, width: .84, height: .14 },
    captionColor: "#d9f3ef",
    radius: 34,
    index: 3
  })
]);

console.log("SCHOOL_SCRAPBOOK_SOURCE_ASSETS_READY 7 sections, 4 greeting cards, 5 quality cards, 1 quote card, 2 frame geometries");
