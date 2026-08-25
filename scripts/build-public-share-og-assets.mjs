import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDirectory = path.join(root, "public", "assets", "share-og");

const cards = [
  {
    id: "paper-birthday",
    name: "Бумажный классический",
    preview: "public/assets/example/template-paper-thumb.png"
  },
  {
    id: "route-adventure",
    name: "Маршрут",
    preview: "public/assets/landing/template-route-adventure-preview.png"
  },
  {
    id: "school-scrapbook",
    name: "Школьный коллаж",
    preview: "public/templates/school-scrapbook/preview.webp"
  },
  {
    id: "school-classic",
    name: "Школьный классический",
    preview: "public/templates/school-classic/preview-v6.webp"
  },
  {
    id: "kindergarten-doodles",
    name: "Детство в рисунках",
    preview: "public/templates/kindergarten-doodles/preview.webp"
  }
];

const escapeXml = (value) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;"
})[character]);

const renderCard = async ({ id, name, preview }) => {
  const previewSource = await readFile(path.join(root, preview));
  const previewBuffer = await sharp(previewSource).png().toBuffer();
  const previewUri = `data:image/png;base64,${previewBuffer.toString("base64")}`;
  const labelWidth = Math.max(190, Math.min(360, 42 + name.length * 13));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <clipPath id="preview-clip"><rect x="650" y="122" width="480" height="380" rx="24"/></clipPath>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.14"/>
        </filter>
      </defs>
      <rect width="1200" height="630" fill="#f7f8fa"/>
      <circle cx="0" cy="0" r="210" fill="#fff0e8"/>
      <circle cx="450" cy="700" r="140" fill="#fff0e8"/>

      <text x="72" y="91" fill="#e9652f" font-family="Arial, DejaVu Sans, sans-serif" font-size="24" font-weight="700">Публичная открытка</text>
      <text x="72" y="163" fill="#202124" font-family="Arial, DejaVu Sans, sans-serif" font-size="54" font-weight="700">Тёплые слова уже</text>
      <text x="72" y="222" fill="#202124" font-family="Arial, DejaVu Sans, sans-serif" font-size="54" font-weight="700">внутри</text>
      <text x="72" y="279" fill="#5f6368" font-family="Arial, DejaVu Sans, sans-serif" font-size="25">Откройте открытку, которой хочется</text>
      <text x="72" y="314" fill="#5f6368" font-family="Arial, DejaVu Sans, sans-serif" font-size="25">поделиться</text>

      <g transform="translate(72 497)">
        <rect width="48" height="48" rx="12" fill="#e9652f"/>
        <path d="M8 17 24 29 40 17M8 39l12-9m20 9-12-9M8 17l16-10 16 10" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="60" y="35" fill="#202124" font-family="Arial, DejaVu Sans, sans-serif" font-size="31" font-weight="700">Slovesto</text>
        <text x="0" y="72" fill="#8a9099" font-family="Arial, DejaVu Sans, sans-serif" font-size="18">Место, где слова становятся подарком</text>
      </g>

      <g transform="rotate(2 890 312)">
        <rect x="640" y="112" width="500" height="400" rx="34" fill="#ffffff" filter="url(#shadow)"/>
        <image href="${previewUri}" x="650" y="122" width="480" height="380" preserveAspectRatio="xMidYMid slice" clip-path="url(#preview-clip)"/>
        <rect x="650.5" y="122.5" width="479" height="379" rx="23.5" fill="none" stroke="#000000" stroke-opacity="0.1"/>
        <rect x="668" y="430" width="${labelWidth}" height="52" rx="26" fill="#ffffff" fill-opacity="0.94" stroke="#000000" stroke-opacity="0.06"/>
        <text x="686" y="464" fill="#202124" font-family="Arial, DejaVu Sans, sans-serif" font-size="19" font-weight="700">${escapeXml(name)}</text>
      </g>
    </svg>`;

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outputDirectory, `${id}-v1.png`));
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(cards.map(renderCard));
console.log(`Generated ${cards.length} static public-share Open Graph images.`);
