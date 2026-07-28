/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Images are rasterized server-side by ImageResponse. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getPublicSharePayload } from "@/lib/public-shares/service";

export const runtime = "nodejs";

const formats = {
  story: { width: 1080, height: 1920, phrases: 2, photos: 3 },
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
const publicOrigin = (request: Request) => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return new URL(configuredUrl).origin;
  return new URL(request.url).origin;
};
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
    <div style={{ position: "absolute", left: "9%", right: "9%", bottom: "7%", height: "18.5%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#5d4436", fontFamily: "Caveat", fontSize: Math.max(15, Math.round(width * .064)), lineHeight: 1.04, textAlign: "center" }}>{trim(photo.caption, width >= 420 ? 66 : 48)}</div>
  </div>
);

const PaperExportCard = ({ payload, format, origin }: { payload: Payload; format: Format; origin: string }) => {
  const preset = formats[format];
  const isStory = format === "story";
  const isPrint = format === "print";
  const photos = payload.photos.slice(0, preset.photos).map((photo) => ({ ...photo, url: new URL(photo.url, origin).toString() }));
  const phrases = payload.phrases.slice(0, preset.phrases);
  const headingSize = isStory ? 68 : isPrint ? 56 : 53;
  const heroPhotoWidth = isStory ? 120 : isPrint ? 112 : 106;
  const heroPadding = isStory ? "52px 52px 32px" : isPrint ? "62px 55px 46px" : "38px 44px 26px";
  const largePhotoWidth = isStory ? 438 : isPrint ? 430 : 370;
  const smallPhotoWidth = isStory ? 258 : isPrint ? 335 : 282;
  const singlePhotoWidth = isStory ? 520 : isPrint ? 540 : 390;
  const momentPhotoSize = (index: number) => {
    const width = photos.length === 1 ? singlePhotoWidth : photos.length === 2 ? (isStory ? 430 : isPrint ? 475 : 430) : index === 0 ? largePhotoWidth : smallPhotoWidth;
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
        {counters.length ? <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 8 }}>{counters.map((item) => <div key={item} style={{ display: "flex", padding: "8px 13px", borderRadius: 99, background: "rgba(255,255,255,.78)", boxShadow: "0 2px 5px rgba(75,45,28,.09)", color: "#714b3b", fontSize: isStory ? 15 : 14, fontWeight: 700 }}>{item}</div>)}</div> : null}
      </div>, { minHeight: isStory ? 425 : isPrint ? 365 : 250 })}

      {payload.qualities.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: isStory ? "20px 20px 18px" : isPrint ? "26px 22px" : "18px 22px" }}>
        <div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 43 : isPrint ? 37 : 32 }}>За что тебя ценят</div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: isStory ? 8 : 10, marginTop: isStory ? 12 : 15 }}>{payload.qualities.slice(0, 5).map((quality, index) => <div key={quality} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: isStory ? 392 : isPrint ? 174 : 164, minHeight: isStory ? 74 : isPrint ? 62 : 58, padding: "10px 18px", backgroundImage: `url(${asset(origin, ["/templates/scrapbook-clean/quality-card-pink.png", "/templates/scrapbook-clean/quality-card-green.png", "/templates/scrapbook-clean/quality-card-blue.png", "/templates/scrapbook-clean/quality-card-beige.png", "/templates/scrapbook-clean/quality-card-violet.png"][index])})`, backgroundSize: "100% 100%", color: "#554035", fontFamily: "Caveat", fontSize: isStory ? 29 : isPrint ? 21 : 18, lineHeight: 1.02, textAlign: "center", transform: `rotate(${index % 2 ? 1 : -1}deg)` }}>{quality}</div>)}</div>
      </div>, { minHeight: isStory ? 180 : isPrint ? 160 : 122 }) : null}

      {photos.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: isStory ? "20px 18px 18px" : isPrint ? "27px 22px 24px" : "18px 22px 19px" }}>
        {photos.length === 3 ? <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: isStory ? 12 : 14 }}>
          {(() => { const main = momentPhotoSize(0); return <Polaroid photo={photos[0]} index={0} width={main.width} height={main.height} origin={origin} />; })()}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isStory ? 9 : 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minHeight: isStory ? 68 : 58 }}><img src={asset(origin, "/templates/scrapbook-clean/camera.png")} style={{ width: isStory ? 38 : 33, height: isStory ? 38 : 33, objectFit: "contain", filter: "contrast(1.6) saturate(1.25)" }} /><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 40 : isPrint ? 35 : 30 }}>Моменты</div><div style={{ display: "flex", color: "#765f50", fontFamily: "Caveat", fontSize: isStory ? 21 : isPrint ? 18 : 17 }}>Фото, которые хочется сохранить</div></div></div>
            <div style={{ display: "flex", gap: isStory ? 10 : 12 }}>{photos.slice(1).map((photo, index) => { const size = momentPhotoSize(index + 1); return <Polaroid key={photo.id} photo={photo} index={index + 1} width={size.width} height={size.height} origin={origin} />; })}</div>
          </div>
        </div> : <><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><img src={asset(origin, "/templates/scrapbook-clean/camera.png")} style={{ width: isStory ? 40 : 34, height: isStory ? 40 : 34, objectFit: "contain", filter: "contrast(1.6) saturate(1.25)" }} /><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 40 : isPrint ? 35 : 30 }}>Моменты</div><div style={{ display: "flex", color: "#765f50", fontFamily: "Caveat", fontSize: isStory ? 22 : isPrint ? 18 : 17 }}>Фото, которые хочется сохранить</div></div></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isStory ? 12 : 14, marginTop: isStory ? 12 : 14 }}>{photos.map((photo, index) => { const size = momentPhotoSize(index); return <Polaroid key={photo.id} photo={photo} index={index} width={size.width} height={size.height} origin={origin} />; })}</div></>}
      </div>, { minHeight: photos.length === 3 ? (isStory ? 390 : isPrint ? 360 : 330) : (isStory ? 450 : isPrint ? 450 : 330) }) : null}

      {phrases.length ? paper(origin, <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: isStory ? "24px 28px" : isPrint ? "30px 24px" : "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 42 : isPrint ? 35 : 30 }}>Особенно тёплые слова</div>
        <div style={{ display: "flex", gap: 16, marginTop: isStory ? 14 : 16 }}>{phrases.map((phrase, index) => <div key={phrase} style={{ position: "relative", display: "flex", flex: 1, alignItems: "center", minHeight: isStory ? 165 : isPrint ? 154 : 126, padding: isStory ? "25px 54px 25px 78px" : isPrint ? "24px 42px 24px 60px" : "20px 42px 20px 58px", overflow: "hidden", backgroundImage: `url(${asset(origin, ["/templates/scrapbook-clean/quote-card-pink-v2.png", "/templates/scrapbook-clean/quote-card-beige.png", "/templates/scrapbook-clean/quote-card-blue.png"][index])})`, backgroundSize: "100% 100%", color: "#4d382f", fontSize: isStory ? 23 : isPrint ? 20 : 19, lineHeight: 1.28, transform: `rotate(${index ? 1 : -1}deg)` }}><span style={{ display: "flex", position: "absolute", left: "7%", top: "13%", color: "#d17182", fontFamily: "Caveat", fontSize: isStory ? 44 : 34 }}>“</span><span style={{ display: "flex", width: "100%", maxHeight: "100%", overflow: "hidden" }}>{trim(phrase, isStory ? 80 : isPrint ? 82 : 102)}</span></div>)}</div>
      </div>, { minHeight: isStory ? 245 : isPrint ? 275 : 185 }) : null}

      {paper(origin, <div style={{ display: "flex", width: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isStory ? "23px 48px" : isPrint ? "31px 42px" : "19px 38px", textAlign: "center" }}>
        <img src={asset(origin, "/templates/scrapbook-clean/footer-floral-cluster.png")} style={{ position: "absolute", right: 0, bottom: 0, width: isStory ? 145 : 124 }} />
        <div style={{ display: "flex", maxWidth: 750, fontFamily: "Caveat", fontWeight: 600, fontSize: isStory ? 31 : isPrint ? 29 : 27 }}>В полной открытке — ещё больше тепла</div>
        <div style={{ display: "flex", maxWidth: 760, marginTop: 5, color: "#695044", fontSize: isStory ? 16 : isPrint ? 20 : 14, lineHeight: 1.28 }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</div>
        <img src={asset(origin, "/brand/email-logo.png")} style={{ width: isStory ? 166 : isPrint ? 154 : 144, height: isStory ? 37 : 35, objectFit: "contain", marginTop: 10 }} />
        <div style={{ display: "flex", marginTop: 1, color: "#816658", fontSize: isStory ? 13 : isPrint ? 16 : 11 }}>Место, где слова становятся подарком</div>
      </div>, { minHeight: isStory ? 176 : isPrint ? 200 : 126 })}
    </div>
  </div>;
};

const RoutePhoto = ({ photo, index, width, origin }: { photo: Payload["photos"][number]; index: number; width: number; origin: string }) => {
  const height = Math.round(width * .67);
  return <div style={{ position: "relative", display: "flex", width, height, flexShrink: 0, boxSizing: "border-box", transform: `rotate(${index === 1 ? 1.2 : index === 2 ? -1.4 : -1.8}deg)`, boxShadow: "0 12px 20px rgba(0,0,0,.24)" }}>
    <img src={asset(origin, "/templates/route-adventure/polaroid-narrow-cream.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <img src={photo.url} style={{ position: "absolute", left: "6%", top: "5.1%", width: "88%", height: "75.9%", objectFit: "cover", outline: "1px solid rgba(0,0,0,.1)" }} />
    <img src={asset(origin, "/templates/route-adventure/polaroid-narrow-cream-overlay.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    <div style={{ position: "absolute", left: "8%", width: "84%", bottom: "4%", height: "16%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", color: "#3b2b1e", fontFamily: "Caveat", fontSize: Math.max(14, Math.round(width * .055)), fontWeight: 600, lineHeight: 1.04, textAlign: "center" }}>{trim(photo.caption, width >= 400 ? 62 : 46)}</div>
  </div>;
};

const RouteExportCard = ({ payload, format, origin }: { payload: Payload; format: Format; origin: string }) => {
  const preset = formats[format];
  const isStory = format === "story";
  const isPrint = format === "print";
  const photos = payload.photos.slice(0, preset.photos).map((photo) => ({ ...photo, url: new URL(photo.url, origin).toString() }));
  const phrases = payload.phrases.slice(0, preset.phrases);
  const counters = [payload.share.showGreetingCount ? `${payload.card.greetingCount} поздравлений` : null, payload.share.showPhotoCount && payload.card.photoCount > 0 ? `${payload.card.photoCount} фото в открытке` : null].filter(Boolean);
  const panel = (children: React.ReactNode, surface: string, style: Record<string, unknown> = {}) => { const isHeroSurface = surface === "/templates/route-adventure/hero-expedition.png"; return <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: isHeroSurface ? "center" : "stretch", width: "100%", boxSizing: "border-box", overflow: "hidden", ...(isHeroSurface ? { backgroundImage: `url(${asset(origin, surface)})`, backgroundSize: !isStory ? "cover" : "100% 100%", backgroundPosition: "center" } : {}), ...style }}>{!isHeroSurface ? <img src={asset(origin, surface)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} /> : null}{children}</div>; };
  const largeWidth = isStory ? 430 : isPrint ? 430 : 365;
  const smallWidth = isStory ? 245 : isPrint ? 325 : 275;
  const pairWidth = isStory ? 420 : isPrint ? 470 : 410;

  return <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", padding: isStory ? 30 : isPrint ? 24 : 20, gap: isStory ? 12 : 10, overflow: "hidden", background: "#10251b", color: "#f3e8d0", fontFamily: "PT Sans" }}>
    <img src={asset(origin, "/templates/route-adventure/bg-topographic.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .88 }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: isStory ? 12 : 10, width: "100%", height: "100%" }}>
      {panel(<><img src={asset(origin, "/templates/route-adventure/compass-medallion.png")} style={{ position: "absolute", left: isStory ? 22 : 18, top: 18, width: isStory ? 96 : 78, height: isStory ? 96 : 78, objectFit: "contain", opacity: .9 }} /><img src={asset(origin, "/templates/route-adventure/expedition-stamp.png")} style={{ position: "absolute", right: isStory ? 24 : 20, top: 19, width: isStory ? 105 : 84, objectFit: "contain", opacity: .92 }} /><div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: isStory ? "62px 130px 34px" : isPrint ? "50px 112px 30px" : "38px 98px 24px", textAlign: "center" }}>{payload.share.showOccasion && payload.card.occasionText ? <div style={{ display: "flex", color: "#d1a65e", fontSize: isStory ? 18 : 15, fontWeight: 700, letterSpacing: .4 }}>{payload.card.occasionText}</div> : null}{payload.share.displayName ? <div style={{ display: "flex", marginTop: 8, color: "#f3e8d0", fontSize: isStory ? 56 : isPrint ? 46 : 43, fontWeight: 700, lineHeight: .95, textAlign: "center" }}>{payload.share.displayName}</div> : null}<div style={{ display: "flex", maxWidth: isStory ? 650 : 760, marginTop: 16, color: "#cbbb9d", fontSize: isStory ? 26 : isPrint ? 20 : 22, lineHeight: 1.32 }}>Близкие люди собрали здесь тёплые слова, фотографии и приятные моменты.</div>{counters.length ? <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginTop: 13 }}>{counters.map((item) => <div key={item} style={{ display: "flex", padding: "7px 12px", borderRadius: 3, background: "rgba(14,23,20,.72)", boxShadow: "inset 0 0 0 1px rgba(209,166,94,.55)", color: "#f3e8d0", fontSize: isStory ? 15 : 14 }}>{item}</div>)}</div> : null}</div></>, "/templates/route-adventure/hero-expedition.png", { minHeight: isStory ? 355 : isPrint ? 292 : 235 })}

      {payload.qualities.length ? panel(<div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: isStory ? "22px 22px 20px" : isPrint ? "22px" : "17px 20px" }}><div style={{ display: "flex", color: "#f3e8d0", fontSize: isStory ? 40 : isPrint ? 34 : 30, fontWeight: 700 }}>За что тебя ценят</div><div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: isStory ? 9 : 10, marginTop: 13 }}>{payload.qualities.slice(0, 5).map((quality) => <div key={quality} style={{ display: "flex", alignItems: "center", justifyContent: "center", ...(isStory ? { width: 392 } : { minWidth: isPrint ? 155 : 145 }), minHeight: isStory ? 55 : 48, padding: "8px 15px", border: "1px solid rgba(209,166,94,.52)", borderRadius: 8, background: "linear-gradient(135deg,#674225,#3f281a)", boxShadow: "inset 0 1px 0 rgba(255,244,210,.1)", color: "#f3e8d0", fontSize: isStory ? 19 : isPrint ? 16 : 15, fontWeight: 700, textAlign: "center" }}>{quality}</div>)}</div></div>, "/templates/route-adventure/leather-stitch-panel.png", { minHeight: isStory ? 195 : isPrint ? 140 : 120 }) : null}

      {photos.length ? panel(<div style={{ display: "flex", flexDirection: "column", padding: isStory ? "20px 17px 18px" : isPrint ? "24px 20px" : "18px 20px" }}>{photos.length === 3 ? <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: isStory ? 12 : 14 }}><RoutePhoto photo={photos[0]} index={0} width={largeWidth} origin={origin} /><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><img src={asset(origin, "/templates/route-adventure/compass-medallion.png")} style={{ width: isStory ? 34 : 28, height: isStory ? 34 : 28, objectFit: "contain" }} /><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", color: "#f3e8d0", fontSize: isStory ? 38 : isPrint ? 33 : 29, fontWeight: 700 }}>Моменты</div><div style={{ display: "flex", color: "#cbbb9d", fontFamily: "Caveat", fontSize: isStory ? 20 : 17 }}>Фото, которыми хочется поделиться</div></div></div><div style={{ display: "flex", gap: isStory ? 10 : 12 }}>{photos.slice(1).map((photo, index) => <RoutePhoto key={photo.id} photo={photo} index={index + 1} width={smallWidth} origin={origin} />)}</div></div></div> : <><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}><img src={asset(origin, "/templates/route-adventure/compass-medallion.png")} style={{ width: isStory ? 34 : 28, height: isStory ? 34 : 28, objectFit: "contain" }} /><div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", color: "#f3e8d0", fontSize: isStory ? 38 : isPrint ? 33 : 29, fontWeight: 700 }}>Моменты</div><div style={{ display: "flex", color: "#cbbb9d", fontFamily: "Caveat", fontSize: isStory ? 20 : 17 }}>Фото, которыми хочется поделиться</div></div></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 13 }}>{photos.map((photo, index) => <RoutePhoto key={photo.id} photo={photo} index={index} width={photos.length === 1 ? largeWidth + 50 : pairWidth} origin={origin} />)}</div></>}</div>, "/templates/route-adventure/moments-field-panel.png", { minHeight: photos.length === 3 ? (isStory ? 390 : isPrint ? 360 : 320) : (isStory ? 420 : isPrint ? 410 : 300) }) : null}

      {phrases.length ? <div style={{ display: "flex", flexDirection: "column", width: "100%", padding: isStory ? "8px 26px" : isPrint ? "10px 24px" : "8px 22px", boxSizing: "border-box" }}><div style={{ display: "flex", justifyContent: "center", color: "#f3e8d0", fontSize: isStory ? 39 : isPrint ? 33 : 29, fontWeight: 700 }}>Особенно тёплые слова</div><div style={{ display: "flex", gap: 14, marginTop: 13 }}>{phrases.map((phrase) => <div key={phrase} style={{ position: "relative", display: "flex", flex: 1, alignItems: "center", minHeight: isStory ? 145 : isPrint ? 138 : 116, padding: isStory ? "23px 38px" : isPrint ? "22px 34px" : "18px 30px", border: "1px solid #b88947", borderRadius: 16, background: `radial-gradient(circle at 45% 35%,rgba(255,236,200,.1),transparent 55%),linear-gradient(180deg,rgba(75,74,69,.92),rgba(41,44,43,.96)),url(${asset(origin, "/templates/route-adventure/quotes-gunmetal.png")}) center / 100% 100% no-repeat`, boxShadow: "0 14px 24px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.18)", color: "#f3e8d0", fontSize: isStory ? 20 : isPrint ? 19 : 17, fontWeight: 700, lineHeight: 1.28, textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,.7)" }}><span style={{ position: "absolute", top: "8%", left: "8%", color: "#d1a65e", fontFamily: "Caveat", fontSize: isStory ? 40 : 32 }}>“</span><span style={{ display: "flex", width: "100%", maxHeight: "100%", overflow: "hidden" }}>{trim(phrase, isStory ? 80 : isPrint ? 82 : 92)}</span></div>)}</div></div> : null}

      {panel(<div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: isStory ? "22px 46px" : isPrint ? "27px 42px" : "18px 34px", textAlign: "center" }}><div style={{ display: "flex", color: "#392719", fontFamily: "Caveat", fontSize: isStory ? 29 : isPrint ? 27 : 25, fontWeight: 600 }}>В полной открытке — ещё больше тепла</div><div style={{ display: "flex", marginTop: 5, color: "#5d4734", fontSize: isStory ? 16 : isPrint ? 19 : 14, lineHeight: 1.28 }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</div><img src={asset(origin, "/brand/email-logo.png")} style={{ width: isStory ? 160 : 145, height: 34, objectFit: "contain", marginTop: 10 }} /></div>, "/templates/route-adventure/closing-kraft-note.png", { minHeight: isStory ? 155 : isPrint ? 175 : 118 })}
    </div>
  </div>;
};

const ExportCard = ({ payload, format, origin }: { payload: Payload; format: Format; origin: string }) =>
  payload.card.templateId === "route-adventure"
    ? <RouteExportCard payload={payload} format={format} origin={origin} />
    : <PaperExportCard payload={payload} format={format} origin={origin} />;

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
  const image = new ImageResponse(<ExportCard payload={payload} format={selectedFormat} origin={publicOrigin(request)} />, { width, height, fonts: [
    { name: "Caveat", data: caveat, weight: 600, style: "normal" },
    { name: "PT Sans", data: ptSans, weight: 400, style: "normal" }
  ] });
  const png = Buffer.from(await image.arrayBuffer());
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (selectedFormat !== "print" || preview) return new Response(new Uint8Array(await sharp(png).flatten({ background: "#f6dfb9" }).png().toBuffer()), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  const jpeg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
  return new Response(new Uint8Array(makePdf(jpeg, width, height)), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=slovesto-card-print.pdf", "Cache-Control": "no-store" } });
}
