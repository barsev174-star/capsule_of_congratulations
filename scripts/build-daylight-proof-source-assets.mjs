import { join } from "node:path";
import sharp from "sharp";

const outputRoot = join(process.cwd(), "template-assets", "daylight-proof", "source");
const underlayAtlas = join(outputRoot, "underlay-art-atlas.png");
const frameAtlas = join(outputRoot, "frame-art-atlas.png");

const colors = {
  ivory: "#fffaf0",
  cobalt: "#1756c6",
  turquoise: "#29b9bd",
  coral: "#f47b5d",
  lemon: "#f4cf32"
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

const quietCenterSvg = (width, height, insetX, insetY, radius) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Math.round(width * insetX)}" y="${Math.round(height * insetY)}"
      width="${Math.round(width * (1 - insetX * 2))}" height="${Math.round(height * (1 - insetY * 2))}"
      rx="${radius}" fill="${colors.ivory}"/>
  </svg>`;

const writeAdaptiveUnderlay = async ({ name, width, height, index, insetX = .065, insetY = .095, radius = 30 }) => {
  const art = await variantBuffer(underlayAtlas, width, height, index);
  await sharp(art)
    .composite([{ input: Buffer.from(quietCenterSvg(width, height, insetX, insetY, radius)) }])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}.png`));
};

const outerMaskSvg = (width, height, radius) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="${radius}" fill="#fff"/>
  </svg>`;

const frameOverlaySvg = ({ width, height, aperture, radius }) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="${radius}" fill="none" stroke="${colors.cobalt}" stroke-width="7"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(radius * .4)}" fill="none" stroke="${colors.ivory}" stroke-width="14"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(radius * .4)}" fill="none" stroke="${colors.turquoise}" stroke-width="7"/>
      <path d="M ${Math.round(width * .1)} ${Math.round(height * .955)} C ${Math.round(width * .3)} ${Math.round(height * .91)}, ${Math.round(width * .62)} ${Math.round(height * .985)}, ${Math.round(width * .9)} ${Math.round(height * .93)}" fill="none" stroke="${colors.coral}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="${Math.round(width * .91)}" cy="${Math.round(height * .055)}" r="${Math.max(7, Math.round(width * .011))}" fill="${colors.lemon}"/>
    </svg>`;
};

const captionPanelSvg = (width, height, captionArea) => `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Math.round(width * captionArea.x)}" y="${Math.round(height * captionArea.y)}"
      width="${Math.round(width * captionArea.width)}" height="${Math.round(height * captionArea.height)}"
      rx="${Math.max(12, Math.round(height * .018))}" fill="${colors.ivory}" fill-opacity=".96"/>
  </svg>`;

const writeFrame = async ({ name, width, height, aperture, captionArea, radius, index }) => {
  const art = await variantBuffer(frameAtlas, width, height, index);
  await sharp(art)
    .composite([
      { input: Buffer.from(captionPanelSvg(width, height, captionArea)) },
      { input: Buffer.from(outerMaskSvg(width, height, radius)), blend: "dest-in" }
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}-base.png`));

  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(frameOverlaySvg({ width, height, aperture, radius })) }])
    .png({ compressionLevel: 9 })
    .toFile(join(outputRoot, `${name}-overlay.png`));
};

const sectionNames = ["hero", "summary", "messages", "memories", "closing"];

await Promise.all([
  ...sectionNames.map((name, index) => writeAdaptiveUnderlay({ name: `section-${name}`, width: 1200, height: 670, index })),
  ...Array.from({ length: 4 }, (_, index) => writeAdaptiveUnderlay({
    name: `greeting-card-${index + 1}`,
    width: 1200,
    height: 400,
    index: index + sectionNames.length,
    insetX: .055,
    insetY: .09,
    radius: 22
  })),
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

console.log("DAYLIGHT_PROOF_SOURCE_ASSETS_READY 5 sections, 4 greeting cards, 2 frame geometries");
