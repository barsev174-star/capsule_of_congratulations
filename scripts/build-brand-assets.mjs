import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const brandDir = path.join(publicDir, "brand");
const readSvg = (file) => readFile(path.join(publicDir, file));

const render = async (svg, width, height, output, background) => {
  const image = sharp(svg, { density: 288 }).resize(width, height, { fit: "contain" });
  await (background ? image.flatten({ background }) : image).png().toFile(path.join(publicDir, output));
};

const createIco = (entries) => {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  const images = [];
  entries.forEach(({ size, png }, index) => {
    const entryOffset = 6 + index * 16;
    header[entryOffset] = size === 256 ? 0 : size;
    header[entryOffset + 1] = size === 256 ? 0 : size;
    header[entryOffset + 2] = 0;
    header[entryOffset + 3] = 0;
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(png.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += png.length;
    images.push(png);
  });
  return Buffer.concat([header, ...images]);
};

const mark = await readSvg("brand/logo-mark.svg");
const favicon = await readSvg("favicon.svg");
const horizontal = await readSvg("brand/logo-horizontal.svg");
const horizontalTagline = await readSvg("brand/logo-horizontal-tagline.svg");

await render(mark, 512, 512, "brand/logo-square-512.png");
await render(horizontal, 480, 144, "brand/email-logo.png");
await render(favicon, 180, 180, "apple-touch-icon.png", "#FFF7EC");
await render(favicon, 192, 192, "android-chrome-192x192.png", "#FFF7EC");
await render(favicon, 512, 512, "android-chrome-512x512.png", "#FFF7EC");

const ogCanvas = sharp({ create: { width: 1200, height: 630, channels: 4, background: "#FFF7EC" } });
const ogLogo = await sharp(horizontalTagline, { density: 288 }).resize(790, 267, { fit: "contain" }).png().toBuffer();
await ogCanvas.composite([{ input: ogLogo, left: 205, top: 182 }]).png().toFile(path.join(brandDir, "og-default-1200x630.png"));

const icoEntries = await Promise.all([16, 24, 32, 48, 64].map(async (size) => ({
  size,
  png: await sharp(favicon, { density: 288 }).resize(size, size).png().toBuffer()
})));
await writeFile(path.join(publicDir, "favicon.ico"), createIco(icoEntries));

console.log("Brand raster assets generated from SVG masters.");
