/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Images are rasterized server-side by ImageResponse. */
import { ImageResponse } from "next/og";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { UniversalTemplateExportCard, universalExportFormats } from "@/components/templates/universal-v1/universal-export-card";
import { getPublicSharePayload } from "@/lib/public-shares/service";
import { buildUniversalPublicViewModel } from "@/lib/public-shares/universal";
import { dispatchTemplateRenderer } from "@/lib/templates/dispatcher";
import { resolveTemplateExportAsset } from "@/lib/templates/export-asset-url";
import type { PublicSharePayload, PublicSharePayloadV1 } from "@/lib/public-shares/types";

export const runtime = "nodejs";

const formats = {
  story: { width: universalExportFormats.story.width, height: universalExportFormats.story.height, phrases: 2, photos: 3 },
  post: { width: universalExportFormats.post.width, height: universalExportFormats.post.height, phrases: 2, photos: 2 },
  print: { width: universalExportFormats.a4.width, height: universalExportFormats.a4.height, phrases: 3, photos: 3 }
} as const;

type Format = keyof typeof formats;
type Payload = PublicSharePayloadV1;

const EXPORT_RENDER_TIMEOUT_MS = 75_000;
const EXPORT_PROXY_TIMEOUT_MS = 82_000;
const EXPORT_WORKER_PORT = 3001;
const MAX_CONCURRENT_EXPORTS = 1;
let activeExports = 0;
let exportSequence = 0;
let exportWorker: ChildProcess | null = null;
let exportWorkerStartup: Promise<void> | null = null;
let exportWorkerCleanupRegistered = false;

class ExportRenderTimeoutError extends Error {
  constructor() {
    super("Public share export render timed out");
    this.name = "ExportRenderTimeoutError";
  }
}

const exportLog = (
  event: "export:start" | "export:assets-loaded" | "export:layout-rendered" | "export:image-rendered" | "export:file-created" | "export:complete" | "export:failed",
  context: { requestId: string; format: Format; startedAt: number; [key: string]: unknown }
) => {
  const { startedAt, ...rest } = context;
  const entry = { level: event === "export:failed" ? "error" : "info", event, durationMs: Date.now() - startedAt, ...rest };
  if (event === "export:failed") console.error(JSON.stringify(entry));
  else console.info(JSON.stringify(entry));
};

const withRenderTimeout = async <T,>(operation: Promise<T>) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ExportRenderTimeoutError()), EXPORT_RENDER_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const stopExportWorker = () => {
  const worker = exportWorker;
  exportWorker = null;
  exportWorkerStartup = null;
  if (worker && worker.exitCode === null) worker.kill("SIGTERM");
};

const waitForExportWorker = async (worker: ChildProcess) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (worker.exitCode !== null) throw new Error(`Export worker exited with code ${worker.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${EXPORT_WORKER_PORT}/robots.txt`, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_000)
      });
      if (response.ok) return;
    } catch {
      // The worker is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Export worker did not become ready");
};

const ensureExportWorker = async () => {
  if (exportWorker && exportWorker.exitCode === null && !exportWorkerStartup) return;
  if (exportWorkerStartup) return exportWorkerStartup;
  const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const worker = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(EXPORT_WORKER_PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, PUBLIC_SHARE_EXPORT_WORKER: "1", PORT: String(EXPORT_WORKER_PORT), HOSTNAME: "127.0.0.1" },
    stdio: ["ignore", "inherit", "inherit"]
  });
  exportWorker = worker;
  if (!exportWorkerCleanupRegistered) {
    exportWorkerCleanupRegistered = true;
    process.once("exit", stopExportWorker);
  }
  worker.once("exit", () => {
    if (exportWorker === worker) {
      exportWorker = null;
      exportWorkerStartup = null;
    }
  });
  exportWorkerStartup = waitForExportWorker(worker).then(() => {
    exportWorkerStartup = null;
  }).catch((error) => {
    stopExportWorker();
    throw error;
  });
  return exportWorkerStartup;
};

const proxyExportToWorker = async (request: Request, token: string, format: Format) => {
  try {
    await ensureExportWorker();
    const sourceUrl = new URL(request.url);
    const workerUrl = new URL(`/share/${encodeURIComponent(token)}/image/${format}`, `http://127.0.0.1:${EXPORT_WORKER_PORT}`);
    workerUrl.search = sourceUrl.search;
    const response = await fetch(workerUrl, { cache: "no-store", signal: AbortSignal.timeout(EXPORT_PROXY_TIMEOUT_MS) });
    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-disposition", "cache-control", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("X-Export-Worker", "isolated");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    stopExportWorker();
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error(JSON.stringify({ level: "error", event: "export:proxy-failed", format, error: error instanceof Error ? error.message : String(error) }));
    return new Response(timedOut
      ? "Подготовка файла заняла слишком много времени. Попробуйте ещё раз чуть позже."
      : "Сервис подготовки файла временно недоступен. Попробуйте ещё раз.", {
      status: timedOut ? 504 : 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
};

// These are deliberately independent compositions, not a scale of /share.
// Values are pixels in the raster canvas; print is rendered at 1240 × 1754.
const layout = {
  story: { pad: 28, gap: 10, hero: 405, qualities: 205, moments: 600, quotes: 270, footer: 280, occasion: 31, name: 84, body: 36, counter: 30, section: 50, quality: 32, momentsTitle: 58, momentsLead: 30, caption: 30, quote: 35, footerTitle: 40, footerBody: 27, logo: 190, tagline: 22, mainPhoto: 567, sidePhoto: 369 },
  post: { pad: 24, gap: 8, hero: 200, qualities: 225, moments: 370, quotes: 160, footer: 228, occasion: 23, name: 54, body: 24, counter: 21, section: 39, quality: 27, momentsTitle: 45, momentsLead: 25, caption: 27, quote: 28, footerTitle: 32, footerBody: 21, logo: 160, tagline: 16, mainPhoto: 470, sidePhoto: 364 },
  print: { pad: 38, gap: 7, hero: 310, qualities: 225, moments: 620, quotes: 210, footer: 245, occasion: 27, name: 58, body: 29, counter: 25, section: 43, quality: 25, momentsTitle: 54, momentsLead: 28, caption: 28, quote: 28, footerTitle: 35, footerBody: 23, logo: 176, tagline: 20, mainPhoto: 609, sidePhoto: 425 }
} as const;

const trim = (text: string | null | undefined, max: number) => {
  const normalized = typeof text === "string" ? text.trim() : "";
  if (normalized.length <= max) return normalized;
  const cut = normalized.slice(0, max + 1).replace(/\s+\S*$/, "").trimEnd();
  return `${cut || normalized.slice(0, max).trimEnd()}…`;
};
const asset = (origin: string, path: string) => new URL(path, origin).toString();
const exportPhoto = (origin: string, path: string) => {
  const url = new URL(path, origin);
  url.searchParams.set("export", "1");
  return url.toString();
};
const rendererOrigin = (request: Request) => process.env.NODE_ENV === "production"
  ? `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`
  : new URL(request.url).origin;
const exportFonts = async () => Promise.all([
  readFile(join(process.cwd(), "public", "fonts", "Caveat-Cyrillic-600.woff")),
  readFile(join(process.cwd(), "public", "fonts", "PTSans-Full-400.ttf"))
]);

export const resolveUniversalExportAsset = (origin: string, src: `/${string}`) => {
  return resolveTemplateExportAsset(src, origin);
};

type Theme = "paper" | "route";
const themeAssets = {
  paper: {
    background: "/templates/scrapbook-clean/bg-paper-texture.png",
    hero: "/templates/scrapbook-clean/torn-paper-section1.png",
    section: "/templates/scrapbook-clean/torn-paper-section1.png",
    polaroid: "/templates/scrapbook-clean/polaroid-frame-horizontal.png",
    quote: ["/templates/scrapbook-clean/quote-card-pink-v2.png", "/templates/scrapbook-clean/quote-card-beige.png", "/templates/scrapbook-clean/quote-card-blue.png"],
    footer: "/templates/scrapbook-clean/torn-paper-section1.png",
    text: "#4d382f", muted: "#765f50", accent: "#c75e79", panelText: "#554035"
  },
  route: {
    background: "/templates/route-adventure/bg-topographic.png",
    hero: "/templates/route-adventure/hero-expedition.png",
    section: "/templates/route-adventure/moments-field-panel.png",
    polaroid: "/templates/route-adventure/polaroid-narrow-cream.png",
    quote: ["/templates/route-adventure/quotes-gunmetal.png"],
    footer: "/templates/route-adventure/closing-kraft-note.png",
    text: "#f3e8d0", muted: "#cbbb9d", accent: "#d1a65e", panelText: "#f3e8d0"
  }
} as const;

const Surface = ({ origin, image, children, style = {}, imageStyle = {}, imageFit = "fill", imagePosition = "center" }: { origin: string; image: string; children: React.ReactNode; style?: Record<string, unknown>; imageStyle?: Record<string, unknown>; imageFit?: "fill" | "cover"; imagePosition?: string }) => (
  <div style={{ position: "relative", display: "flex", overflow: "hidden", width: "100%", boxSizing: "border-box", ...style }}>
    <img src={asset(origin, image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: imageFit, objectPosition: imagePosition, ...imageStyle }} />
    <div style={{ position: "relative", display: "flex", width: "100%" }}>{children}</div>
  </div>
);

// Satori reliably renders <img> layers, while CSS background shorthand drops
// transparent scrapbook PNGs in some export environments. Keep those assets as
// explicit layers so the paper template matches the public card.
const PaperLayer = ({ origin, image, style = {} }: { origin: string; image: string; style?: Record<string, unknown> }) => (
  <img src={asset(origin, image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", ...style }} />
);

const PaperHeroPolaroid = ({ origin, photo, side, format }: { origin: string; photo: string; side: "left" | "right"; format: Format }) => {
  const compact = format === "post";
  const width = compact ? 118 : format === "print" ? 150 : 160;
  const height = Math.round(width * 1.18);
  const rotation = side === "left" ? -10 : 7;
  const left = side === "left"
    ? compact ? 10 : 10
    : compact ? 918 : format === "print" ? 988 : 836;
  return <div style={{ position: "absolute", display: "flex", left, top: compact ? 18 : 14, width, height, overflow: "hidden", transform: `rotate(${rotation}deg)` }}>
    <img src={asset(origin, photo)} style={{ position: "absolute", left: "17%", top: "13.5%", width: "66%", height: "56.5%", objectFit: "cover" }} />
    <img src={asset(origin, "/templates/scrapbook-clean/polaroid-transparent.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
  </div>;
};

const PaperHeroDecor = ({ origin, format }: { origin: string; format: Format }) => <>
  <PaperHeroPolaroid origin={origin} photo="/templates/scrapbook-clean/top-polaroid-cake.png" side="left" format={format} />
  <PaperHeroPolaroid origin={origin} photo="/templates/scrapbook-clean/top-polaroid-bouquet.png" side="right" format={format} />
  <img src={asset(origin, "/templates/scrapbook-clean/heart-sticker-puffy-gold.png")} style={{ position: "absolute", left: format === "post" ? 128 : 194, top: format === "post" ? 72 : 116, width: format === "post" ? 27 : 43, transform: "rotate(18deg)" }} />
</>;

const PaperMomentsDecor = ({ origin, format }: { origin: string; format: Format }) => <>
  <img src={asset(origin, "/templates/scrapbook-clean/camera.png")} style={{ position: "absolute", top: format === "post" ? 10 : 20, left: format === "post" ? "48%" : "42%", width: format === "post" ? 46 : 76, transform: "rotate(8deg)", opacity: .9 }} />
  <img src={asset(origin, "/templates/scrapbook-clean/heart-sticker-puffy-pink.png")} style={{ position: "absolute", top: format === "post" ? 36 : 58, right: format === "post" ? 44 : 76, width: format === "post" ? 35 : 56, transform: "rotate(14deg)" }} />
</>;

const PhotoCard = ({ photo, index, width, theme, origin, captionSize, format, scaleX = 1 }: { photo: Payload["photos"][number]; index: number; width: number; theme: Theme; origin: string; captionSize: number; format: Format; scaleX?: number }) => {
  const route = theme === "route";
  const height = Math.round(width * (route ? .69 : .707));
  const frame = themeAssets[theme].polaroid;
  const isPrintSidePhoto = format === "print" && index > 0;
  const isPostSecondPhoto = format === "post" && index === 1;
  const isCompactCaption = isPrintSidePhoto || isPostSecondPhoto;
  const captionHeight = route ? format === "story" ? "18%" : isCompactCaption ? "18.5%" : "20%" : "15%";
  const captionBottom = route ? format === "story" ? "1.5%" : isCompactCaption ? "0.5%" : "2.5%" : format === "story" ? index > 0 ? "7%" : "5%" : "9%";
  const captionLineHeight = format === "story" ? .96 : isCompactCaption ? 1 : format === "post" ? 1.03 : 1.06;
  const routeCaptionSize = format === "story"
    ? Math.min(captionSize, Math.round(width * .068))
    : isCompactCaption
      ? captionSize - 1
      : captionSize;
  const captionLimit = format === "story" ? (width >= 420 ? 62 : 44) : format === "post" ? 54 : 68;
  const rotation = `rotate(${index === 1 ? 1.2 : index === 2 ? -1.2 : -1.5}deg)`;
  const transform = scaleX === 1 ? rotation : `scaleX(${scaleX}) ${rotation}`;
  return <div style={{ position: "relative", display: "flex", width, height, flexShrink: 0, transform, boxShadow: route ? "0 8px 16px rgba(0,0,0,.22)" : "none" }}>
    {route ? <img src={asset(origin, frame)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <img src={photo.url} style={{ position: "absolute", left: route ? "6%" : "11.7%", top: route ? "5.1%" : "11.2%", width: route ? "88%" : "75.7%", height: route ? "75.9%" : "63%", objectFit: "cover", ...(route ? { outline: "1px solid rgba(0,0,0,.1)" } : {}) }} />
    {!route ? <img src={asset(origin, frame)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    {route ? <img src={asset(origin, "/templates/route-adventure/polaroid-narrow-cream-overlay.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div style={{ position: "absolute", left: route ? "8%" : "9%", right: route ? "8%" : "9%", bottom: captionBottom, height: route ? captionHeight : format === "story" ? "22%" : "20%", display: "flex", alignItems: "center", justifyContent: "center", ...(format === "story" ? {} : { maxHeight: "2.12em" }), overflow: "hidden", color: "#3b2b1e", fontFamily: "Caveat", fontSize: route ? routeCaptionSize : captionSize, fontWeight: 600, lineHeight: captionLineHeight, textAlign: "center" }}>{trim(photo.caption, captionLimit)}</div>
  </div>;
};

const CounterIcon = ({ kind, size, color = "#efbd67" }: { kind: "greetings" | "photos"; size: number; color?: string }) => kind === "greetings" ? <div style={{ position: "relative", display: "flex", width: size, height: size, flexShrink: 0 }}>
  <span style={{ position: "absolute", left: Math.round(size * .34), top: 0, width: Math.round(size * .32), height: Math.round(size * .32), boxSizing: "border-box", border: `2px solid ${color}`, borderRadius: 999 }} />
  <span style={{ position: "absolute", left: Math.round(size * .12), bottom: 0, width: Math.round(size * .76), height: Math.round(size * .43), boxSizing: "border-box", border: `2px solid ${color}`, borderRadius: "10px 10px 5px 5px" }} />
</div> : <div style={{ position: "relative", display: "flex", width: size, height: Math.round(size * .78), flexShrink: 0, boxSizing: "border-box", border: `2px solid ${color}`, borderRadius: 3 }}>
  <span style={{ position: "absolute", left: Math.round(size * .2), bottom: Math.round(size * .13), width: Math.round(size * .5), height: Math.round(size * .28), boxSizing: "border-box", borderLeft: `2px solid ${color}`, borderTop: `2px solid ${color}`, transform: "skewY(-28deg)" }} />
  <span style={{ position: "absolute", right: Math.round(size * .13), top: Math.round(size * .13), width: 4, height: 4, background: color, borderRadius: 999 }} />
</div>;

const ExportCard = ({ payload, format, origin }: { payload: Payload; format: Format; origin: string }) => {
  const p = layout[format];
  const theme: Theme = payload.card.templateId === "route-adventure" ? "route" : "paper";
  const a = themeAssets[theme];
  const photos = payload.photos.slice(0, formats[format].photos).map((photo) => ({ ...photo, url: exportPhoto(origin, photo.url) }));
  const phrases = payload.phrases.slice(0, formats[format].phrases);
  const counters = [
    payload.share.showGreetingCount ? { kind: "greetings" as const, label: `${payload.card.greetingCount} поздравлений` } : null,
    payload.share.showPhotoCount && payload.card.photoCount > 0 ? { kind: "photos" as const, label: `${payload.card.photoCount} фото в открытке` } : null
  ].filter((counter): counter is { kind: "greetings" | "photos"; label: string } => counter !== null);
  const panelStyle = theme === "route" ? { border: "1px solid rgba(184,137,71,.58)", borderRadius: 15, boxShadow: "0 10px 22px rgba(0,0,0,.2)" } : {};
  const paper = theme === "paper";
  const paperHeroHeight = format === "story" ? p.hero : format === "post" ? 225 : 330;
  const paperQualitiesHeight = format === "story" ? p.qualities : format === "post" ? 260 : 245;
  // Keep the full footer safely inside the fixed raster canvas for the tall exports.
  const paperMomentsHeight = format === "story" ? 540 : format === "post" ? 420 : 595;
  const paperFooterHeight = format === "story" ? p.footer : format === "post" ? 200 : 224;
  const paperQualityAssets = ["/templates/scrapbook-clean/quality-card-pink.png", "/templates/scrapbook-clean/quality-card-violet.png", "/templates/scrapbook-clean/quality-card-beige.png", "/templates/scrapbook-clean/quality-card-green.png", "/templates/scrapbook-clean/quality-card-blue.png"];
  const titleStyle = { display: "flex", justifyContent: "center", fontFamily: theme === "paper" ? "Caveat" : "PT Sans", fontSize: p.section, fontWeight: 700, color: a.text, textAlign: "center" as const };

  const momentHeading = <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ ...titleStyle, fontSize: p.momentsTitle }}>Моменты</div><div style={{ display: "flex", color: a.muted, fontFamily: "Caveat", fontSize: p.momentsLead, marginTop: -4 }}>Фото, которыми хочется поделиться</div></div>;
  const moments = photos.length === 3 && format !== "post" ? <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
    <div style={{ display: "flex", alignSelf: "flex-start", ...(format === "story" ? { position: "absolute", left: 92, top: paper ? 38 : 10 } : { position: "absolute", left: 78, top: 52 }) }}>{momentHeading}</div>
    <div style={{ display: "flex", alignItems: format === "story" ? "flex-start" : "flex-end", justifyContent: "center", gap: 0, marginTop: format === "story" ? 12 : 24, width: "100%", ...(format === "story" ? { transform: "translateX(5px)" } : format === "print" ? { transform: "translateX(10px)" } : {}) }}>
      <div style={{ display: "flex", paddingTop: format === "story" ? 128 : 0, ...(format === "print" ? { position: "relative", left: paper ? -20 : -38, top: paper ? -66 : -8 } : {}) }}><PhotoCard photo={photos[0]} index={0} width={paper ? Math.round(p.mainPhoto * (format === "print" ? 1 : 1.05)) : p.mainPhoto} theme={theme} origin={origin} captionSize={p.caption} format={format} scaleX={!paper && format === "print" ? 1.05 : 1} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, ...(format === "print" ? paper ? { transform: "translateX(-12px)" } : { position: "relative", left: -12 } : {}) }}>{photos.slice(1).map((photo, index) => <div key={photo.id} style={paper && (format === "story" || format === "print") ? { display: "flex", transform: index === 0 ? `translateY(${format === "print" ? 12 : 10}px)` : `translateY(-${format === "print" ? 12 : 10}px)` } : { display: "flex" }}><PhotoCard photo={photo} index={index + 1} width={paper ? Math.round(p.sidePhoto * (format === "print" ? 1 : 1.1)) : p.sidePhoto} theme={theme} origin={origin} captionSize={p.caption} format={format} scaleX={!paper && format === "print" ? 1.1 : 1} /></div>)}</div>
    </div>
  </div> : photos.length === 2 && format === "post" ? <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, width: "100%" }}>
    <div style={{ display: "flex", ...(paper ? { transform: "translateX(-12px)" } : {}) }}><PhotoCard photo={photos[0]} index={0} width={paper ? Math.round(p.mainPhoto * 1.05) : p.mainPhoto} theme={theme} origin={origin} captionSize={p.caption} format={format} /></div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>{momentHeading}<PhotoCard photo={photos[1]} index={1} width={paper ? Math.round(p.sidePhoto * 1.08) : p.sidePhoto} theme={theme} origin={origin} captionSize={p.caption} format={format} /></div>
  </div> : photos.length === 2 && format === "print" ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
    <div style={{ ...titleStyle, fontSize: p.momentsTitle }}>Моменты</div><div style={{ display: "flex", color: a.muted, fontFamily: "Caveat", fontSize: p.momentsLead, marginTop: -4 }}>Фото, которыми хочется поделиться</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}><PhotoCard photo={photos[0]} index={0} width={535} theme={theme} origin={origin} captionSize={p.caption} format={format} /><PhotoCard photo={photos[1]} index={1} width={535} theme={theme} origin={origin} captionSize={p.caption} format={format} /></div>
  </div> : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
    <div style={{ ...titleStyle, fontSize: p.momentsTitle }}>Моменты</div><div style={{ display: "flex", color: a.muted, fontFamily: "Caveat", fontSize: p.momentsLead, marginTop: -4 }}>Фото, которыми хочется поделиться</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 12 }}>{photos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} index={index} width={photos.length === 1 ? p.mainPhoto + 115 : p.mainPhoto} theme={theme} origin={origin} captionSize={p.caption} format={format} />)}</div>
  </div>;

  return <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", overflow: "hidden", boxSizing: "border-box", padding: format === "print" ? "34px 38px 52px" : p.pad, background: theme === "route" ? "#0d1714" : "#f6dfb9", color: a.text, fontFamily: "PT Sans" }}>
    <img src={asset(origin, a.background)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: theme === "route" ? .16 : .34 }} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: paper ? 4 : p.gap, width: "100%" }}>
      <Surface origin={origin} image={a.hero} imageFit={theme === "route" && format === "post" ? "cover" : "fill"} imagePosition={format === "post" ? "center top" : "center"} style={{ minHeight: paper ? paperHeroHeight : p.hero }}>
        {paper ? <PaperHeroDecor origin={origin} format={format} /> : null}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: theme === "route" ? format === "post" ? "8px 110px 6px" : "38px 120px 28px" : format === "post" ? "26px 70px 10px" : "42px 70px 26px", textAlign: "center" }}>
          {payload.share.showOccasion && payload.card.occasionText ? <div style={{ display: "flex", color: a.accent, fontSize: p.occasion, fontWeight: 700 }}>{payload.card.occasionText}</div> : null}
          {payload.share.displayName ? <div style={{ display: "flex", justifyContent: "center", maxWidth: "100%", marginTop: 9, color: a.text, fontFamily: theme === "paper" ? "Caveat" : "PT Sans", fontSize: p.name, fontWeight: 700, lineHeight: .96, textAlign: "center" }}>{trim(payload.share.displayName, 46)}</div> : null}
          <div style={{ display: "flex", maxWidth: 800, marginTop: paper && format === "post" ? 10 : 14, color: a.muted, fontSize: paper && format === "post" ? p.body - 2 : p.body, lineHeight: 1.23 }}>Близкие люди собрали здесь тёплые слова, фотографии и приятные моменты.</div>
          {counters.length ? <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: paper && format === "post" ? 9 : 13 }}>{counters.map((counter) => <div key={counter.kind} style={{ display: "flex", alignItems: "center", gap: 9, padding: paper ? format === "post" ? "6px 14px" : "8px 15px" : "10px 18px", background: paper ? "rgba(255,252,246,.9)" : "linear-gradient(135deg,#8a592d,#5b351d)", border: paper ? "1px solid rgba(199,94,121,.24)" : "1px solid rgba(225,181,100,.72)", borderRadius: 999, boxShadow: paper ? "0 3px 7px rgba(103,72,55,.12)" : "inset 0 1px 0 rgba(255,239,196,.2), 0 3px 8px rgba(0,0,0,.2)", color: paper ? "#6a453b" : "#fff1d0", fontSize: p.counter, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}><CounterIcon kind={counter.kind} size={Math.round(p.counter * .8)} color={paper ? "#c75e79" : undefined} />{counter.label}</div>)}</div> : null}
        </div>
      </Surface>

      {payload.qualities.length ? <Surface origin={origin} image={theme === "route" ? "/templates/route-adventure/qualities-walnut-wood.png" : a.section} style={{ minHeight: paper ? paperQualitiesHeight : p.qualities, ...panelStyle }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: paper && format === "post" ? "8px 22px" : "14px 22px" }}>
          <div style={titleStyle}>За что тебя ценят</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 9, marginTop: 10 }}>
            {payload.qualities.slice(0, 5).map((quality, index) => <div key={quality} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: paper ? format === "story" ? 430 : format === "post" ? 450 : 515 : format === "story" ? 430 : format === "post" ? 450 : 520, minHeight: paper ? format === "post" ? 52 : 68 : format === "post" ? 42 : 50, padding: "7px 14px", boxSizing: "border-box", overflow: "hidden", background: theme === "route" ? "linear-gradient(135deg,#674225,#3f281a)" : "transparent", ...(theme === "route" ? { border: "1px solid rgba(209,166,94,.52)", borderRadius: 8 } : {}), color: a.panelText, fontSize: p.quality, fontWeight: 700, lineHeight: 1.04, textAlign: "center" }}>{paper ? <PaperLayer origin={origin} image={paperQualityAssets[index]} style={{ transform: "scale(1.04)" }} /> : null}<span style={{ position: "relative", zIndex: 1, display: "flex" }}>{trim(quality, 28)}</span></div>)}
          </div>
        </div>
      </Surface> : null}

      {photos.length ? <Surface origin={origin} image={theme === "route" ? a.section : a.section} style={{ minHeight: paper ? paperMomentsHeight : p.moments, ...(paper ? { width: "calc(100% + 28px)", marginLeft: -14 } : {}), ...panelStyle }}><div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: format === "story" || format === "print" ? "0 14px" : "16px 14px", boxSizing: "border-box" }}>{paper ? <PaperMomentsDecor origin={origin} format={format} /> : null}<div style={{ position: "relative", zIndex: 2, display: "flex", width: "100%" }}>{moments}</div></div></Surface> : null}

      {phrases.length ? <div style={{ display: "flex", flexDirection: "column", width: "100%" }}><div style={titleStyle}>Особенно тёплые слова</div><div style={{ display: "flex", gap: format === "post" ? 10 : format === "print" ? 4 : 14, marginTop: 10, ...(paper && format === "print" ? { width: "calc(100% + 28px)", marginLeft: -14 } : {}) }}>{phrases.map((phrase, index) => <div key={phrase} style={{ position: "relative", display: "flex", flex: 1, alignItems: "center", minHeight: format === "post" ? p.quotes - 54 : format === "print" ? p.quotes - 58 : p.quotes - 62, padding: format === "post" ? "12px 26px 12px 74px" : format === "print" ? "14px 20px 14px 62px" : "22px 40px", boxSizing: "border-box", overflow: "hidden", background: theme === "route" ? `linear-gradient(180deg,rgba(75,74,69,.94),rgba(41,44,43,.98)),url(${asset(origin, a.quote[0])}) center / 100% 100%` : "transparent", ...(theme === "route" ? { border: "1px solid #b88947", borderRadius: 16 } : {}), color: a.text, fontSize: paper ? p.quote - (format === "story" ? 2 : 4) : p.quote, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{paper ? <PaperLayer origin={origin} image={a.quote[index % a.quote.length]} style={{ transform: "translate(-5%,-4%) scale(1.14)" }} /> : null}<span style={{ position: "absolute", zIndex: 1, left: paper && format === "post" ? "14%" : paper && format === "print" ? "12%" : format === "post" ? 24 : format === "print" ? 18 : "7%", top: paper && format === "print" ? "7%" : format === "story" ? "9%" : "14%", color: a.accent, fontFamily: "Caveat", fontSize: p.quote + 15 }}>“</span><span style={{ position: "relative", zIndex: 1, display: "flex", ...(format === "story" ? {} : { justifyContent: "center", width: "100%" }), maxHeight: "3.6em", overflow: "hidden" }}>{trim(phrase, format === "print" ? 118 : 92)}</span></div>)}</div></div> : null}

      <Surface origin={origin} image={a.footer} imageStyle={!paper && (format === "story" || format === "print") ? { transform: "scaleY(1.12)" } : {}} style={{ minHeight: paper ? paperFooterHeight : p.footer, marginBottom: paper ? format === "story" ? 12 : format === "print" ? 20 : 8 : format === "story" ? 12 : format === "print" ? 6 : 0 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: format === "story" ? "12px 52px 10px" : format === "print" ? "8px 52px 6px" : "10px 52px 14px", boxSizing: "border-box", textAlign: "center" }}><div style={{ display: "flex", color: theme === "route" ? "#392719" : a.text, fontFamily: "Caveat", fontSize: paper && format === "post" ? p.footerTitle - 3 : p.footerTitle, fontWeight: 600 }}>В полной открытке — ещё больше тепла</div><div style={{ display: "flex", maxWidth: 850, marginTop: 5, color: theme === "route" ? "#5d4734" : a.muted, fontSize: paper && format === "post" ? p.footerBody - 2 : p.footerBody, lineHeight: 1.2 }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</div><img src={asset(origin, "/brand/email-logo.png")} style={{ width: p.logo, height: Math.round(p.logo * .23), objectFit: "contain", marginTop: format === "story" ? 8 : 6 }} /><div style={{ display: "flex", marginTop: 3, color: theme === "route" ? "#5d4734" : a.muted, fontSize: paper && format === "post" ? p.tagline - 1 : p.tagline }}>Место, где слова становятся подарком</div></div></Surface>
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
  const selectedFormat = format as Format;
  if (process.env.NODE_ENV === "production" && process.env.PUBLIC_SHARE_EXPORT_WORKER !== "1") {
    if (activeExports >= MAX_CONCURRENT_EXPORTS) {
      return new Response("Сейчас уже готовится другой файл. Повторите попытку через несколько секунд.", {
        status: 429,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5" }
      });
    }
    activeExports += 1;
    try {
      return await proxyExportToWorker(request, token, selectedFormat);
    } finally {
      activeExports -= 1;
    }
  }
  if (activeExports >= MAX_CONCURRENT_EXPORTS) {
    return new Response("Сейчас уже готовится другой файл. Повторите попытку через несколько секунд.", {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5" }
    });
  }
  activeExports += 1;
  const startedAt = Date.now();
  const requestId = `${process.pid}-${++exportSequence}`;
  const log = (event: Parameters<typeof exportLog>[0], extra: Record<string, unknown> = {}) => exportLog(event, { requestId, format: selectedFormat, startedAt, ...extra });
  log("export:start", { activeExports });
  let releaseWhenRenderSettles = false;
  try {
  let payload: PublicSharePayload | null = null;
  if (process.env.NODE_ENV === "development") {
    const { buildLegacyExportBaselinePayload, getLegacyTemplateIdFromExportBaselineToken } = await import(
      "@/lib/final-card/legacy-baseline"
    );
    const baselineTemplateId = getLegacyTemplateIdFromExportBaselineToken(token);
    if (baselineTemplateId) payload = buildLegacyExportBaselinePayload(baselineTemplateId);
    if (!payload && token === "school-scrapbook-export-baseline") {
      const { schoolScrapbookDemoCardModel: model } = await import("@/lib/example-card");
      payload = {
        version: 2,
        family: "universal-v1",
        share: { displayName: model.recipientName, headlinePreset: "GIFTED_CARD", showOccasion: true, showEventDate: true, showGreetingCount: true, showPhotoCount: true },
        card: { templateId: model.templateId, occasionText: model.occasion, eventDate: model.eventDate, fromLabel: model.fromLabel, greetingCount: model.participantCount, photoCount: model.memoryPhotos.length },
        qualities: [...model.qualities],
        phrases: [...model.privateQuotes.slice(0, 3)],
        photos: model.memoryPhotos.map((photo, index) => ({ id: photo.id, url: `/examples/kristina/${index + 1}.jpg`, width: photo.width, height: photo.height, caption: photo.caption, crop: photo.crop }))
      };
    }
  }
  payload ??= await getPublicSharePayload(token);
  if (!payload) return new Response(null, { status: 404 });
  const { width, height } = formats[selectedFormat];
  const [caveat, ptSans] = await exportFonts();
  const origin = rendererOrigin(request);
  log("export:assets-loaded", { payloadVersion: payload.version, width, height });
  const fonts = [
    { name: "Caveat", data: caveat, weight: 600 as const, style: "normal" as const },
    { name: "PT Sans", data: ptSans, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: ptSans, weight: 400 as const, style: "normal" as const }
  ];
  let image: ImageResponse;
  if (payload.version === 2) {
    const dispatch = dispatchTemplateRenderer(payload.card.templateId);
    if (!dispatch || dispatch.kind !== "universal-v1" || dispatch.registration.profile.export.profile !== "universal-export-v1") {
      return new Response(null, { status: 404 });
    }
    const profile = dispatch.registration.profile;
    const model = buildUniversalPublicViewModel(payload, profile);
    const resolveAsset = (path: `/${string}`) => resolveUniversalExportAsset(origin, path);
    image = new ImageResponse(
      <UniversalTemplateExportCard
        profile={profile}
        model={model}
        format={selectedFormat === "print" ? "a4" : selectedFormat}
        resolveAsset={resolveAsset}
        resolvePhoto={(path) => exportPhoto(origin, path)}
      />,
      { width, height, fonts }
    );
  } else {
    image = new ImageResponse(<ExportCard payload={payload} format={selectedFormat} origin={origin} />, { width, height, fonts });
  }
  log("export:layout-rendered");
  let png: Buffer;
  const renderPromise = image.arrayBuffer();
  try {
    png = Buffer.from(await withRenderTimeout(renderPromise));
  } catch (error) {
    log("export:failed", { stage: "image-rendered", error: error instanceof Error ? error.message : String(error) });
    if (error instanceof ExportRenderTimeoutError) {
      releaseWhenRenderSettles = true;
      void renderPromise.finally(() => { activeExports -= 1; }).catch(() => undefined);
      return new Response("Подготовка файла заняла слишком много времени. Попробуйте ещё раз чуть позже.", {
        status: 504,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }
    return new Response("Не удалось подготовить файл. Попробуйте ещё раз.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  log("export:image-rendered", { pngBytes: png.length });
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (selectedFormat !== "print" || preview) {
    log("export:file-created", { contentType: "image/png", fileBytes: png.length });
    log("export:complete");
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Length": String(png.length), "Cache-Control": "no-store" } });
  }
  const jpeg = await sharp(png).jpeg({ quality: 92 }).toBuffer();
  const pdf = makePdf(jpeg, width, height);
  log("export:file-created", { contentType: "application/pdf", fileBytes: pdf.length });
  log("export:complete");
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Length": String(pdf.length), "Content-Disposition": "attachment; filename=slovesto-card-print.pdf", "Cache-Control": "no-store" } });
  } catch (error) {
    log("export:failed", { stage: "route", error: error instanceof Error ? error.message : String(error) });
    return new Response("Не удалось подготовить файл. Попробуйте ещё раз.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  } finally {
    if (!releaseWhenRenderSettles) activeExports -= 1;
  }
}
