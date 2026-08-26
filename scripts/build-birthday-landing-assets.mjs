import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Inputs: viewport captures of the opened birthday demo, first at the top,
// then at #messages (section top at 90px), using a 1280x720 viewport.
// Capture through Browser after images/fonts load; avoid stitched full-page shots.
// node scripts/build-birthday-landing-assets.mjs tmp/birthday/hero-viewport-v2.jpg tmp/birthday/messages-viewport-v2.jpg
const [heroSource, messagesSource] = process.argv.slice(2);
if (!heroSource || !messagesSource) throw new Error("Pass the hero and messages viewport screenshot paths.");
const output = path.resolve("public/landing/birthday");
await mkdir(output, { recursive: true });
for (const source of [heroSource, messagesSource]) {
  const metadata = await sharp(source).metadata();
  if (metadata.width < 1250 || metadata.width > 1280 || metadata.height < 700) {
    throw new Error("Expected birthday captures from a 1280x720 viewport (scrollbar may be excluded).");
  }
}
const hero = await sharp(heroSource)
  .extract({ left: 70, top: 55, width: 1130, height: 610 })
  .resize(1100, 594, { fit: "cover" }).webp({ quality: 88 }).toBuffer();
await sharp(hero).toFile(path.join(output, "example-hero-v2.webp"));
const messages = await sharp(messagesSource)
  .extract({ left: 70, top: 90, width: 1130, height: 610 })
  .resize(1100, 594, { fit: "cover" }).webp({ quality: 88 })
  .toBuffer();
await sharp(messages).toFile(path.join(output, "example-messages-v2.webp"));

const preview = await sharp(messages).resize(490, 265).png().toBuffer();
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f7f8fa"/>
  <text x="60" y="92" font-family="Arial, sans-serif" font-size="35" font-weight="700" fill="#202124">Slovesto</text>
  <rect x="60" y="128" width="56" height="5" rx="2" fill="#e9652f"/>
  <g font-family="Arial, sans-serif" fill="#202124" font-size="48" font-weight="700">
    <text x="60" y="218">Групповая открытка</text>
    <text x="60" y="282">на день рождения</text>
  </g>
  <text x="60" y="342" font-family="Arial, sans-serif" fill="#5f6368" font-size="29">От друзей и близких</text>
  <g font-family="Arial, sans-serif" fill="#5f6368" font-size="24">
    <text x="60" y="430">Ваши люди. Ваши слова.</text>
    <text x="60" y="466">Один подарок.</text>
  </g>
  <rect x="60" y="518" width="269" height="48" rx="24" fill="#e9652f"/>
  <text x="84" y="550" font-family="Arial, sans-serif" fill="#ffffff" font-size="22" font-weight="700">Начните бесплатно</text>
  <rect x="640" y="169" width="516" height="291" rx="26" fill="#ffffff"/>
  <image x="653" y="182" width="490" height="265" href="data:image/png;base64,${preview.toString("base64")}"/>
</svg>`;
await sharp(Buffer.from(artwork)).jpeg({ quality: 90 }).toFile(path.join(output, "og-birthday-v2.jpg"));
console.log("Built birthday landing previews and social image.");
