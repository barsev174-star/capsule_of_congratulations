/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Images are rasterized server-side by ImageResponse. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getPublicSharePayload } from "@/lib/public-shares/service";

export const runtime = "nodejs";

const formats = {
  story: { width: 1080, height: 1920, phrases: 1, photos: 3 },
  post: { width: 1080, height: 1350, phrases: 2, photos: 3 },
  print: { width: 1240, height: 1754, phrases: 3, photos: 3 }
} as const;

type Format = keyof typeof formats;
type Payload = NonNullable<Awaited<ReturnType<typeof getPublicSharePayload>>>;

const trim = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1).replace(/\s+\S*$/, "").trimEnd();
  return `${cut || text.slice(0, max).trimEnd()}…`;
};
const asset = (origin: string, path: string) => new URL(path, origin).toString();
const exportFonts = async () => Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Caveat-Cyrillic-600.woff")),
  readFile(join(process.cwd(), "public", "fonts", "PTSans-Cyrillic-400.woff"))
]);

const paper = (origin: string, children: React.ReactNode, style: Record<string, unknown> = {}) => (
  <div style={{ position: "relative", display: "flex", overflow: "hidden", ...style }}>
    <img src={asset(origin, "/templates/scrapbook-clean/torn-paper-section1.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div style={{ position: "relative", display: "flex", width: "100%" }}>{children}</div>
  </div>
);

const Polaroid = ({ photo, index, width, height, origin }: { photo: Payload["photos"][number]; index: number; width: number; height: number; origin: string }) => (
  <div style={{ position: "relative", display: "flex", width, height, flexShrink: 0, transform: `rotate(${index === 1 ? 1.4 : index === 2 ? -1.1 : -1.8}deg)` }}>
    <img src={photo.url} style={{ position: "absolute", left: "8.2%", top: "12.5%", width: "83.6%", height: "60.5%", objectFit: "cover", outline: "1px solid rgba(0,0,0,.1)" }} />
    <img src={asset(origin, "/templates/scrapbook-clean/polaroid-frame-horizontal.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div style={{ position: "absolute", left: "9%", right: "9%", bottom: "4.8%", height: "18.5%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#5d4436", fontFamily: "Caveat", fontSize: Math.max(15, Math.round(width * .064)), lineHeight: 1.04, textAlign: "center" }}>{trim(photo.caption, width >= 420 ? 66 : 48)}</div>
  </div>
);

const ExportCard = ({ payload, format, origin }: { payload: Payload; format: Format; origin: string }) => {
  const preset = formats[format];
  const isStory = format === "story";
  const isPrint = format === "print";
  const photos = payload.photos.slice(0, preset.photos).map((photo) => ({ ...photo, url: new URL(photo.url, origin).toString() }));
  const phrases = payload.phrases.slice(0, preset.phrases);
  const headingSize = isStory ? 68 : isPrint ? 56 : 53;
  const heroPhotoWidth = isStory ? 120 : isPrint ? 112 : 106;
  const heroPadding = isStory ? "52px 52px 32px" : isPrint ? "62px 55px 46px" : "38px 44px 26px";
  const largePhotoWidth = isStory ? 450 : isPrint ? 480 : 340;
  const smallPhotoWidth = isStory ? 260 : isPrint ? 310 : 225;
  const singlePhotoWidth = isStory ? 520 : isPrint ? 540 : 390;
  const momentPhotoSize = (index: number) => {
    const width = photos.length === 1 ? singlePhotoWidth : photos.length === 2 || index === 0 ? largePhotoWidth : smallPhotoWidth;
    return { width, height: Math.round(width * .75) };
  };
  const counterPhoto = payload.share.showPhotoCount && payload.card.photoCount > 0 ? `${payload.card.photoCount} фото в открытке` : null;
  const counters = [payload.share.showGreetingCount ? `${payload.card.greetingCount} поздравлений` : null, counterPhoto].filter(Boolean);
  const sectionGap = isStory ? 10 : isPrint ? 11 : 9;

  return <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", padding: isStory ? 30 : isPrint ? 22 : 20, background: "#f6dfb9", color: "#453027", fontFamily: "PT Sans", position: "relative" }}>
    <img src={asset(origin, "/templates/scrapbook-clean/bg-paper-texture.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .34 }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: sectionGap, width: "100%" }}>
      {paper(origin, <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: heroPadding, textAlign: "center" }}>
        <div style={{ position: "absolute", display: "flex", left: 26, top: 26, padding: 7, background: "#fffdf6", boxShadow: "0 6px 10px rgba(70,44,28,.2)", transform: "rotate(-7deg)" }}><img src={asset(origin, "/templates/scrapbook-clean/top-polaroid-cake.png")} style={{ width: heroPhotoWidth, height: heroPhotoWidth * 1.18, objectFit: "cover" }} /></div>
        <div style={{ position: "absolute", display: "flex", right: 26, top: 26, padding: 7, background: "#fffdf6", boxShadow: "0 6px 10px rgba(70,44,28,.2)", transform: "rotate(6deg)" }}><img src={asset(origin, "/templates/scrapbook-clean/top-polaroid-bouquet.png")} style={{ width: heroPhotoWidth, height: heroPhotoWidth * 1.18, objectFit: "cover" }} /></div>
        {payload.share.showOccasion && payload.card.occasionText ? <div style={{ display: "flex", padding: "6px 13px", borderRadius: 10, background: "rgba(255,246,235,.78)", color: "#cd637b", fontSize: isStory ? 18 : 15, fontWeight: 700 }}>{payload.card.occasionText}</div> : null}
        {payload.share.displayName ? <div style={{ display: "flex", maxWidth: isStory ? 530 : isPrint ? 640 : 560, marginTop: 12, color: "#c75e79", fontFamily: "Caveat", fontSize: headingSize, fontWeight: 600, lineHeight: .92, textAlign: "center" }}>{payload.share.displayName}</div> : null}
        <div style={{ display: "flex", maxWidth: isStory ? 620 : 730, marginTop: 18, fontSize: isStory ? 28 : isPrint ? 21 : 24, lineHeight: 1.35, textAlign: "center" }}>Близкие люди собрали здесь тёплые слова, фотографии и приятные моменты.</div>
        {counters.length ? <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12 }}>{counters.map((item) => <div key={item} style={{ display: "flex", padding: "8px 13px", borderRadius: 99, background: "rgba(255,255,255,.78)", boxShadow: "0 2px 5px rgba(75,45,28,.09)", color: "#714b3b", fontSize: isStory ? 15 : 14, fontWeight: 700 }}>{item}</div>)}</div> : null}
      </div>, { minHeight: isStory ? 425 : isPrint ? 365 : 250 })}

      {payload.qualities.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: isStory ? "23px 20px 21px" : isPrint ? "30px 22px" : "21px 22px" }}>
        <div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 43 : isPrint ? 37 : 32 }}>За что тебя ценят</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: isStory ? 8 : 10, marginTop: isStory ? 12 : 15 }}>{payload.qualities.slice(0, 5).map((quality, index) => <div key={quality} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: isStory ? 392 : isPrint ? 174 : 164, minHeight: isStory ? 74 : isPrint ? 62 : 58, padding: "10px 18px", backgroundImage: `url(${asset(origin, ["/templates/scrapbook-clean/quality-card-pink.png", "/templates/scrapbook-clean/quality-card-green.png", "/templates/scrapbook-clean/quality-card-blue.png", "/templates/scrapbook-clean/quality-card-beige.png", "/templates/scrapbook-clean/quality-card-violet.png"][index])})`, backgroundSize: "100% 100%", color: "#554035", fontFamily: "Caveat", fontSize: isStory ? 29 : isPrint ? 21 : 18, lineHeight: 1.02, textAlign: "center", transform: `rotate(${index % 2 ? 1 : -1}deg)` }}>{quality}</div>)}</div>
      </div>, { minHeight: isStory ? 195 : isPrint ? 175 : 132 }) : null}

      {photos.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: isStory ? "23px 18px 22px" : isPrint ? "35px 22px" : "22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><img src={asset(origin, "/templates/scrapbook-clean/camera.png")} style={{ width: isStory ? 40 : 34, height: isStory ? 40 : 34, objectFit: "contain", filter: "contrast(1.35) saturate(1.2)" }} /><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 40 : isPrint ? 35 : 30 }}>Моменты</div><div style={{ display: "flex", marginTop: 0, color: "#765f50", fontFamily: "Caveat", fontSize: isStory ? 22 : isPrint ? 18 : 17 }}>Фото, которые хочется сохранить</div></div></div>
        <div style={{ display: "flex", alignItems: isStory ? "center" : "flex-start", justifyContent: "center", gap: isStory ? 12 : 14, marginTop: isStory ? 14 : 17 }}>{photos.map((photo, index) => { const size = momentPhotoSize(index); return <Polaroid key={photo.id} photo={photo} index={index} width={size.width} height={size.height} origin={origin} />; })}</div>
      </div>, { minHeight: isStory ? 475 : isPrint ? 485 : 305 }) : null}

      {phrases.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: isStory ? "24px 28px" : isPrint ? "30px 24px" : "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 42 : isPrint ? 35 : 30 }}>Особенно тёплые слова</div>
        <div style={{ display: "flex", gap: 16, marginTop: isStory ? 14 : 16 }}>{phrases.map((phrase, index) => <div key={phrase} style={{ position: "relative", display: "flex", flex: 1, alignItems: "center", minHeight: isStory ? 165 : isPrint ? 154 : 126, padding: isStory ? "25px 78px" : isPrint ? "25px 54px" : "21px 48px", overflow: "hidden", backgroundImage: `url(${asset(origin, ["/templates/scrapbook-clean/quote-card-pink-v2.png", "/templates/scrapbook-clean/quote-card-beige.png", "/templates/scrapbook-clean/quote-card-blue.png"][index])})`, backgroundSize: "100% 100%", color: "#4d382f", fontSize: isStory ? 23 : isPrint ? 20 : 19, lineHeight: 1.28, transform: `rotate(${index ? 1 : -1}deg)` }}><span style={{ display: "flex", position: "absolute", left: "7%", top: "13%", color: "#d17182", fontFamily: "Caveat", fontSize: isStory ? 44 : 34 }}>“</span><span style={{ display: "flex", width: "100%", maxHeight: "100%", overflow: "hidden" }}>{trim(phrase, isStory ? 145 : isPrint ? 82 : 102)}</span><span style={{ display: "flex", position: "absolute", right: "7%", bottom: "12%", color: "#ce1f4d", fontFamily: "Caveat", fontSize: isStory ? 31 : 25 }}>♥</span></div>)}</div>
      </div>, { minHeight: isStory ? 245 : isPrint ? 275 : 185 }) : null}

      {paper(origin, <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isStory ? "23px 48px" : isPrint ? "31px 42px" : "19px 38px", textAlign: "center" }}>
        <img src={asset(origin, "/templates/scrapbook-clean/footer-floral-cluster.png")} style={{ position: "absolute", right: 0, bottom: 0, width: isStory ? 145 : 124 }} />
        <div style={{ display: "flex", maxWidth: 750, fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 31 : isPrint ? 29 : 27 }}>В полной открытке — ещё больше тепла</div>
        <div style={{ display: "flex", maxWidth: 760, marginTop: 5, color: "#695044", fontSize: isStory ? 16 : isPrint ? 20 : 14, lineHeight: 1.28 }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</div>
        <img src={asset(origin, "/brand/logo-horizontal.svg")} style={{ width: isStory ? 166 : isPrint ? 154 : 144, height: isStory ? 37 : 35, objectFit: "contain", marginTop: 10 }} />
        <div style={{ display: "flex", marginTop: 1, color: "#816658", fontSize: isStory ? 13 : isPrint ? 16 : 11 }}>Место, где слова становятся подарком</div>
      </div>, { minHeight: isStory ? 176 : isPrint ? 200 : 126 })}
    </div>
  </div>;
};

const makePdf = (jpeg: Buffer, width: number, height: number) => {
  const content = Buffer.from("q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n");
  const header = Buffer.from("%PDF-1.4\n");
  const objects = [
    Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    Buffer.from("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    Buffer.from("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"),
    Buffer.concat([Buffer.from(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from("\nendstream\nendobj\n")]),
    Buffer.concat([Buffer.from(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`), content, Buffer.from("endstream\nendobj\n")])
  ];
  let offset = header.length;
  const offsets = [0];
  for (const object of objects) { offsets.push(offset); offset += object.length; }
  const xref = Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((item) => `${String(item).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`);
  return Buffer.concat([header, ...objects, xref]);
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string; format: string }> }) {
  const { token, format } = await params;
  if (!(format in formats)) return new Response(null, { status: 404 });
  const payload = await getPublicSharePayload(token);
  if (!payload) return new Response(null, { status: 404 });
  const selectedFormat = format as Format;
  const { width, height } = formats[selectedFormat];
  const [caveat, ptSans] = await exportFonts();
  const image = new ImageResponse(<ExportCard payload={payload} format={selectedFormat} origin={new URL(request.url).origin} />, { width, height, fonts: [
    { name: "Caveat", data: caveat, weight: 600, style: "normal" },
    { name: "PT Sans", data: ptSans, weight: 400, style: "normal" }
  ] });
  const png = Buffer.from(await image.arrayBuffer());
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (selectedFormat !== "print" || preview) return new Response(new Uint8Array(await sharp(png).flatten({ background: "#f6dfb9" }).png().toBuffer()), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  const jpeg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
  return new Response(new Uint8Array(makePdf(jpeg, width, height)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=slovesto-card-print.pdf", "Cache-Control": "no-store" } });
}
