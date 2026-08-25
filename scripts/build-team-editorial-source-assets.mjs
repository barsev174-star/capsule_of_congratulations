import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceRoot = join(root, "template-assets", "team-editorial", "source");
const source = (name) => join(sourceRoot, name);

await mkdir(sourceRoot, { recursive: true });

const palette = {
  ivory: "#f6f1e8",
  paper: "#fffaf2",
  navy: "#14283b",
  teal: "#2f6f70",
  blueTeal: "#2b5260",
  orange: "#c8643f",
  kraft: "#d5b98d",
  stone: "#c8c0ae"
};
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const writeSvg = async (name, width, height, body, opaque = false) => {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="paper" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency=".52" numOctaves="2" seed="17" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
        <feBlend in="SourceGraphic" in2="gray" mode="soft-light"/>
      </filter>
      <filter id="softShadow" x="-20%" y="-25%" width="140%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity=".16"/>
      </filter>
      <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="2" fill="${palette.navy}" fill-opacity=".28"/>
      </pattern>
      <pattern id="linen" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 2H16M0 10H16" stroke="#ffffff" stroke-opacity=".035"/>
        <path d="M2 0V16M10 0V16" stroke="#ffffff" stroke-opacity=".025"/>
      </pattern>
    </defs>
    ${opaque ? `<rect width="${width}" height="${height}" fill="${palette.ivory}"/>` : ""}
    ${body}
  </svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(source(name));
};

const pageBody = (width, height) => `
  <rect width="${width}" height="${height}" fill="${palette.ivory}" filter="url(#paper)"/>
  <rect x="0" y="0" width="${Math.round(width * .075)}" height="${height}" fill="${palette.navy}"/>
  <rect x="${Math.round(width * .075)}" y="0" width="${Math.round(width * .012)}" height="${height}" fill="${palette.teal}" fill-opacity=".14"/>
  <rect x="${Math.round(width * .69)}" y="0" width="${Math.round(width * .31)}" height="${Math.round(height * .065)}" fill="${palette.teal}"/>
  <rect x="${Math.round(width * .94)}" y="${Math.round(height * .65)}" width="${Math.round(width * .06)}" height="${Math.round(height * .22)}" fill="${palette.orange}"/>
  <rect x="${Math.round(width * .012)}" y="${Math.round(height * .12)}" width="${Math.round(width * .035)}" height="${Math.round(height * .18)}" fill="url(#dots)"/>
  <path d="M${Math.round(width * .6)} 0C${Math.round(width * .49)} ${Math.round(height * .12)} ${Math.round(width * .48)} ${Math.round(height * .28)} ${Math.round(width * .61)} ${Math.round(height * .36)}" fill="none" stroke="${palette.navy}" stroke-opacity=".55" stroke-width="2"/>
`;

await writeSvg("page.png", 1536, 1024, pageBody(1536, 1024), true);

await writeSvg("section-summary.png", 1200, 420, `
  <rect x="16" y="18" width="1168" height="384" rx="10" fill="${palette.paper}" filter="url(#softShadow)"/>
  <rect x="16" y="18" width="120" height="384" rx="10" fill="${palette.navy}"/>
  <rect x="132" y="62" width="2" height="296" fill="${palette.kraft}"/>
  <path d="M1100 35H1155V90" fill="none" stroke="${palette.orange}" stroke-width="5"/>
  <rect x="1080" y="68" width="72" height="90" fill="url(#dots)" opacity=".65"/>
  <path d="M1040 346C1080 260 1135 255 1180 310V390H1040Z" fill="${palette.kraft}" fill-opacity=".18"/>
`, true);

const messagesBody = (width, height, mobile = false) => `
  <rect width="${width}" height="${height}" fill="${palette.ivory}" filter="url(#paper)"/>
  <rect x="${mobile ? 18 : 26}" y="${mobile ? 18 : 26}" width="${width - (mobile ? 36 : 52)}" height="${height - (mobile ? 36 : 52)}" rx="${mobile ? 18 : 24}" fill="${palette.paper}" stroke="${palette.navy}" stroke-opacity=".12" stroke-width="2"/>
  <rect x="${mobile ? 18 : 26}" y="${mobile ? 18 : 26}" width="${mobile ? 18 : 24}" height="${height - (mobile ? 36 : 52)}" rx="10" fill="${palette.teal}"/>
  <rect x="${width - (mobile ? 115 : 190)}" y="${mobile ? 36 : 46}" width="${mobile ? 76 : 130}" height="${mobile ? 100 : 145}" fill="url(#dots)"/>
  <path d="M${mobile ? 64 : 92} ${mobile ? 26 : 30}H${width - (mobile ? 64 : 92)}" stroke="${palette.orange}" stroke-width="4" stroke-linecap="round"/>
`;
await writeSvg("section-messages.png", 1200, 900, messagesBody(1200, 900), true);
await writeSvg("section-messages-mobile.png", 600, 900, messagesBody(600, 900, true), true);

const memoriesBody = (width, height, mobile = false) => `
  <rect width="${width}" height="${height}" rx="${mobile ? 20 : 28}" fill="${palette.blueTeal}"/>
  <rect width="${width}" height="${height}" rx="${mobile ? 20 : 28}" fill="url(#linen)"/>
  <rect x="${mobile ? 18 : 26}" y="${mobile ? 18 : 26}" width="${width - (mobile ? 36 : 52)}" height="${height - (mobile ? 36 : 52)}" rx="${mobile ? 16 : 22}" fill="none" stroke="#ffffff" stroke-opacity=".11" stroke-width="2"/>
  <rect x="${mobile ? 36 : 48}" y="${height - (mobile ? 126 : 96)}" width="${mobile ? 106 : 154}" height="${mobile ? 82 : 62}" fill="${palette.orange}" fill-opacity=".2" transform="rotate(-5 ${mobile ? 36 : 48} ${height - (mobile ? 126 : 96)})"/>
  <g opacity=".48"><circle cx="${width - (mobile ? 110 : 164)}" cy="${mobile ? 64 : 66}" r="2" fill="#ffffff"/><circle cx="${width - (mobile ? 84 : 132)}" cy="${mobile ? 64 : 66}" r="2" fill="#ffffff"/><circle cx="${width - (mobile ? 58 : 100)}" cy="${mobile ? 64 : 66}" r="2" fill="#ffffff"/><circle cx="${width - (mobile ? 110 : 164)}" cy="${mobile ? 90 : 94}" r="2" fill="#ffffff"/><circle cx="${width - (mobile ? 84 : 132)}" cy="${mobile ? 90 : 94}" r="2" fill="#ffffff"/><circle cx="${width - (mobile ? 58 : 100)}" cy="${mobile ? 90 : 94}" r="2" fill="#ffffff"/></g>
`;
await writeSvg("section-memories.png", 1200, 680, memoriesBody(1200, 680), true);
await writeSvg("section-memories-mobile.png", 600, 900, memoriesBody(600, 900, true), true);

const closingBody = (width, height, mobile = false) => `
  <rect width="${width}" height="${height}" fill="${palette.ivory}" filter="url(#paper)"/>
  <rect x="0" y="${height - (mobile ? 120 : 88)}" width="${mobile ? 130 : 240}" height="${mobile ? 120 : 88}" fill="${palette.navy}"/>
  <rect x="${mobile ? 88 : 170}" y="${height - (mobile ? 82 : 56)}" width="${mobile ? 145 : 230}" height="${mobile ? 82 : 56}" fill="${palette.orange}" transform="rotate(-4 ${mobile ? 88 : 170} ${height - (mobile ? 82 : 56)})"/>
  <rect x="${width - (mobile ? 135 : 250)}" y="0" width="${mobile ? 135 : 250}" height="${mobile ? 105 : 72}" fill="${palette.teal}"/>
  <rect x="${width - (mobile ? 118 : 205)}" y="${mobile ? 66 : 48}" width="${mobile ? 80 : 140}" height="${mobile ? 110 : 95}" fill="url(#dots)"/>
  <circle cx="${width - (mobile ? 62 : 110)}" cy="${height - (mobile ? 72 : 58)}" r="${mobile ? 28 : 34}" fill="none" stroke="${palette.navy}" stroke-width="7"/>
`;
await writeSvg("section-closing.png", 1200, 460, closingBody(1200, 460), true);
await writeSvg("section-closing-mobile.png", 600, 780, closingBody(600, 780, true), true);

const rails = [palette.navy, palette.orange, palette.teal, palette.kraft];
for (let index = 1; index <= 4; index += 1) {
  await writeSvg(`greeting-card-${index}.png`, 1200, 500, `
    <rect x="16" y="18" width="1168" height="464" rx="20" fill="${palette.paper}" filter="url(#softShadow)"/>
    <rect x="16" y="18" width="24" height="464" rx="12" fill="${rails[index - 1]}"/>
    <circle cx="90" cy="90" r="30" fill="${rails[index - 1]}" fill-opacity=".13"/>
    <path d="M1080 60H1140" stroke="${rails[index - 1]}" stroke-width="4"/>
    <rect x="1060" y="92" width="92" height="70" fill="url(#dots)" opacity=".58"/>
  `, true);
}

const qualityColors = [palette.navy, palette.teal, palette.paper, palette.orange, palette.stone];
for (let index = 1; index <= 5; index += 1) {
  const fill = qualityColors[index - 1];
  const stroke = index === 3 ? palette.navy : palette.paper;
  await writeSvg(`quality-card-${index}.png`, 480, 258, `
    <rect x="18" y="34" width="444" height="188" rx="18" fill="${fill}" stroke="${stroke}" stroke-opacity=".28" stroke-width="2" filter="url(#softShadow)"/>
    <path d="M52 74H116" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="416" cy="82" r="18" fill="none" stroke="${stroke}" stroke-width="3"/>
  `);
  await writeSvg(`quality-card-${index}-export.png`, 720, 180, `
    <rect x="18" y="18" width="684" height="144" rx="18" fill="${fill}" stroke="${stroke}" stroke-opacity=".28" stroke-width="2" filter="url(#softShadow)"/>
    <path d="M48 55H110" stroke="${stroke}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="660" cy="58" r="15" fill="none" stroke="${stroke}" stroke-width="3"/>
  `);
}

const quoteAccents = [palette.navy, palette.orange, palette.teal];
for (let index = 1; index <= 3; index += 1) {
  await writeSvg(`quote-card-${index}.png`, 800, 640, `
    <rect x="38" y="42" width="724" height="550" rx="18" fill="${palette.paper}" filter="url(#softShadow)"/>
    <rect x="38" y="42" width="96" height="550" rx="18" fill="${quoteAccents[index - 1]}"/>
    <path d="M82 162C55 162 52 125 70 98C84 77 106 66 124 62M82 162V224H134V162H82Z" fill="${palette.paper}" fill-opacity=".94"/>
    <rect x="610" y="88" width="102" height="96" fill="url(#dots)"/>
    <path d="M590 540H704" stroke="${quoteAccents[index - 1]}" stroke-width="5"/>
  `);
  await writeSvg(`quote-card-${index}-export.png`, 720, 180, `
    <rect x="18" y="18" width="684" height="144" rx="18" fill="${palette.paper}" filter="url(#softShadow)"/>
    <path d="M36 18H100V162H36C26.059 162 18 153.941 18 144V36C18 26.059 26.059 18 36 18Z" fill="${quoteAccents[index - 1]}"/>
    <path d="M54 62C33 62 31 42 43 29C54 18 76 18 92 20M54 62V98H100V62H54Z" fill="${palette.paper}" fill-opacity=".94"/>
    <rect x="630" y="42" width="54" height="54" fill="url(#dots)" opacity=".58"/>
    <path d="M630 137H680" stroke="${quoteAccents[index - 1]}" stroke-width="4"/>
  `);
}

const frameSvg = (width, height, aperture, caption) => {
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  return `
    <rect x="14" y="14" width="${width - 28}" height="${height - 28}" rx="18" fill="#ffffff" filter="url(#softShadow)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${palette.ivory}"/>
    <path d="M${Math.round(width * caption.x)} ${Math.round(height * (caption.y - .018))}H${Math.round(width * (caption.x + caption.width))}" stroke="${palette.navy}" stroke-opacity=".1" stroke-width="2"/>
  `;
};
const writeFrame = async (name, width, height, aperture, caption) => {
  await writeSvg(`${name}-base.png`, width, height, frameSvg(width, height, aperture, caption));
  const x = Math.round(width * aperture.x);
  const y = Math.round(height * aperture.y);
  const w = Math.round(width * aperture.width);
  const h = Math.round(height * aperture.height);
  await writeSvg(`${name}-overlay.png`, width, height, `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="#000000" stroke-opacity=".1" stroke-width="2"/>
  `);
};
await writeFrame("photo-frame-portrait", 802, 1122, { x: .04, y: .03, width: .92, height: .82 }, { x: .05, y: .855, width: .9, height: .125 });
await writeFrame("photo-frame-landscape", 1122, 802, { x: .035, y: .05, width: .93, height: .75 }, { x: .045, y: .805, width: .91, height: .17 });
await writeFrame("photo-frame-memory", 1122, 802, { x: .025, y: .035, width: .95, height: .8 }, { x: .035, y: .835, width: .93, height: .145 });

const trimToTransparent = async (input) => sharp(input).trim({ background: transparent, threshold: 8 }).png().toBuffer();
for (const [master, output] of [["hero-left-master-v2.png", "hero-left.png"], ["hero-right-master-v2.png", "hero-right.png"]]) {
  const object = await trimToTransparent(source(master));
  await sharp({ create: { width: 720, height: 1080, channels: 4, background: transparent } })
    .composite([{ input: await sharp(object).resize(650, 1010, { fit: "contain", background: transparent }).png().toBuffer(), gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(source(output));
}

const tagText = Buffer.from(`<svg width="720" height="1080" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(-6 397 556)" fill="${palette.navy}" font-family="Inter, Arial, sans-serif" text-anchor="middle"><text x="397" y="500" font-size="23" font-weight="800" letter-spacing="4">СПАСИБО</text><text x="397" y="538" font-size="17" font-weight="700" letter-spacing="2.2">ЗА ТО, ЧТО ТЫ</text><text x="397" y="576" font-size="23" font-weight="800" letter-spacing="4">ЕСТЬ</text><path d="M350 610H444" stroke="${palette.orange}" stroke-width="4"/></g></svg>`);
const heroLeftWithText = await sharp(source("hero-left.png")).composite([{ input: tagText, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toBuffer();
await sharp(heroLeftWithText).toFile(source("hero-left.png"));

const previewBase = await sharp(Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="${palette.ivory}"/><rect width="88" height="630" fill="${palette.navy}"/><rect x="885" width="315" height="58" fill="${palette.teal}"/><path d="M705 0C610 110 610 250 760 320" fill="none" stroke="${palette.navy}" stroke-opacity=".5" stroke-width="2"/><rect x="934" y="412" width="266" height="126" fill="${palette.orange}"/></svg>`)).png().toBuffer();
const left = await sharp(source("hero-left.png")).resize(310, 465, { fit: "contain", background: transparent }).png().toBuffer();
const right = await sharp(source("hero-right.png")).resize(300, 450, { fit: "contain", background: transparent }).png().toBuffer();
const title = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><g fill="${palette.navy}" font-family="Inter, Arial, sans-serif"><text x="420" y="230" font-size="26" font-weight="700" letter-spacing="5">ВМЕСТЕ</text><text x="420" y="305" font-size="64" font-weight="800">Спасибо за всё,</text><text x="420" y="375" font-size="64" font-weight="800">что было вместе</text><text x="422" y="430" font-size="22" fill="${palette.teal}">Современная открытка для важных людей рядом</text></g><path d="M422 472H610" stroke="${palette.teal}" stroke-width="7"/></svg>`);
await sharp(previewBase).composite([{ input: left, left: 82, top: 82 }, { input: right, left: 885, top: 105 }, { input: title, left: 0, top: 0 }]).png({ compressionLevel: 9 }).toFile(source("catalog-preview.png"));

console.log("TEAM_EDITORIAL_SOURCE_ASSETS_BUILT_V1");
