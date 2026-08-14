import { join } from "node:path";
import sharp from "sharp";

const outputRoot = join(process.cwd(), "template-assets", "school-scrapbook", "source");
const pageMaster = join(outputRoot, "page-master.png");
const underlayAtlas = join(outputRoot, "underlay-art-atlas.png");
const frameAtlas = join(outputRoot, "frame-art-atlas.png");
const heroCardMaster = join(outputRoot, "hero-card-master.png");
const quoteCardMaster = join(outputRoot, "quote-card-master.png");

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

const writeAdaptiveUnderlay = async ({
  name,
  source = underlayAtlas,
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

const captionPanelSvg = (width, height, captionArea) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Math.round(width * captionArea.x)}" y="${Math.round(height * captionArea.y)}"
      width="${Math.round(width * captionArea.width)}" height="${Math.round(height * captionArea.height)}"
      rx="${Math.max(12, Math.round(height * .018))}" fill="${colors.cream}" fill-opacity=".97"/>
  </svg>`;

const writeFrame = async ({ name, width, height, aperture, captionArea, radius, index }) => {
  const art = await variantBuffer(frameAtlas, width, height, index);
  await sharp(art)
    .composite([
      { input: Buffer.from(captionPanelSvg(width, height, captionArea)) },
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

const sectionNames = ["hero", "summary", "qualities", "messages", "memories", "quotes", "closing"];

await Promise.all([
  ...sectionNames.map((name, index) => writeAdaptiveUnderlay({
    name: `section-${name}`,
    source: name === "hero" ? heroCardMaster : underlayAtlas,
    width: 1200,
    height: 670,
    index,
    insetX: name === "hero" ? .075 : .065,
    insetY: name === "hero" ? .11 : .095,
    centerOpacity: name === "hero" ? .9 : .95
  })),
  ...Array.from({ length: 4 }, (_, index) => writeAdaptiveUnderlay({
    name: `greeting-card-${index + 1}`,
    width: 1200,
    height: 400,
    index: index + sectionNames.length,
    insetX: .055,
    insetY: .09,
    radius: 24,
    centerOpacity: .96
  })),
  writeAdaptiveUnderlay({
    name: "quality-card",
    source: heroCardMaster,
    width: 480,
    height: 258,
    index: 1,
    insetX: .05,
    insetY: .1,
    radius: 24,
    centerOpacity: .97
  }),
  writeAdaptiveUnderlay({
    name: "quote-card",
    source: quoteCardMaster,
    width: 1402,
    height: 1122,
    index: 0,
    insetX: .055,
    insetY: .08,
    radius: 42,
    centerOpacity: .95
  }),
  writeFrame({
    name: "photo-frame-portrait",
    width: 802,
    height: 1122,
    aperture: { x: .08, y: .05, width: .84, height: .76 },
    captionArea: { x: .08, y: .83, width: .84, height: .11 },
    radius: 34,
    index: 0
  }),
  writeFrame({
    name: "photo-frame-landscape",
    width: 1122,
    height: 802,
    aperture: { x: .08, y: .07, width: .84, height: .70 },
    captionArea: { x: .08, y: .80, width: .84, height: .14 },
    radius: 34,
    index: 3
  })
]);

console.log("SCHOOL_SCRAPBOOK_SOURCE_ASSETS_READY 7 sections, 4 greeting cards, 2 frame geometries");
