import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { logger } from "@/lib/logger";
import { cleanImportedDescription, cleanImportedTitle, sanitizeGiftPollText } from "./text-sanitization";

export type GiftLinkPreview = {
  extractedUrl: string;
  resolvedUrl: string;
  metadata: { title: string | null; description: string | null; imageUrl: string | null; price: { amount: number; currency: string } | null; storeName: string | null };
  warnings: Array<"URL_NOT_FOUND" | "PAGE_UNAVAILABLE" | "METADATA_PARTIAL" | "IMAGE_UNAVAILABLE" | "PRICE_UNAVAILABLE" | "UNSUPPORTED_CONTENT">;
};

const MAX_HTML_BYTES = 750_000;
const MAX_REDIRECTS = 3;
const timeout = 7_000;
const urlPattern = /https?:\/\/[^\s<>"']+/gi;

export const extractProductUrl = (rawInput: string) => {
  for (const match of rawInput.match(urlPattern) ?? []) {
    const candidate = match.replace(/[)\],.!?:;]+$/g, "");
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch { /* Try the next URL. */ }
  }
  return null;
};

const trackingParamPattern = /^(utm_|yclid|gclid|dclid|fbclid|gbraid|wbraid|mc_cid|mc_eid|igshid|_openstat|ysclid|erid$|srsltid)/i;
const privateParamPattern = /^(email|e-?mail|phone|tel|first_?name|last_?name|user_?id|uid|access_?token|auth|authorization|password|secret|session_?id)$/i;

// Returns a safe canonical product URL: keeps the path and product-identifying
// parameters, drops fragments and advertising/analytics parameters.
export const cleanProductUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (trackingParamPattern.test(key) || privateParamPattern.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return null; }
};

const blockedImagePattern = /(favicon|logo|icon|sprite|placeholder|blank\.|spacer|pixel|tracking|avatar|1x1)/i;

// Validates an extracted image candidate: only http/https product images,
// never favicons, logos, UI icons, placeholders or tracking pixels.
export const productImageUrl = (value: string | null, base: string) => {
  const absoluteUrl = absolute(value, base);
  if (!absoluteUrl) return null;
  try {
    const url = new URL(absoluteUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (/\.svg$/i.test(url.pathname) || blockedImagePattern.test(url.pathname)) return null;
    const inlineSize = url.pathname.match(/(?:^|[^\d])(\d{1,4})x(\d{1,4})(?:[^\d]|$)/);
    if (inlineSize && Math.max(Number(inlineSize[1]), Number(inlineSize[2])) < 100) return null;
    const width = Number(url.searchParams.get("w") ?? url.searchParams.get("width") ?? 0);
    const height = Number(url.searchParams.get("h") ?? url.searchParams.get("height") ?? 0);
    if (width > 0 && height > 0 && Math.max(width, height) < 100) return null;
    return url.toString();
  } catch { return null; }
};

const isBlockedAddress = (address: string) => {
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.includes(":")) return /^(fc|fd|fe8|fe9|fea|feb)/i.test(address);
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};

const assertPublicUrl = async (url: URL) => {
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("BLOCKED_ADDRESS");
  const literal = isIP(url.hostname);
  const records = literal ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => isBlockedAddress(address))) throw new Error("BLOCKED_ADDRESS");
};

const readLimitedText = async (response: Response) => {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_HTML_BYTES) throw new Error("HTML_TOO_LARGE");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    total += item.value.byteLength;
    if (total > MAX_HTML_BYTES) throw new Error("HTML_TOO_LARGE");
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
};

const meta = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"));
  return match?.[1]?.trim() ?? null;
};
const titleTag = (html: string) => html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
const absolute = (value: string | null, base: string) => { try { return value ? new URL(value, base).toString() : null; } catch { return null; } };

const jsonLdProduct = (html: string) => {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) try {
    const values = JSON.parse(block[1]); const queue = Array.isArray(values) ? values : [values];
    for (const value of queue) {
      const product = value?.["@graph"]?.find?.((item: { [key: string]: unknown }) => String(item?.["@type"]).includes("Product")) ?? value;
      if (!String(product?.["@type"] ?? "").includes("Product")) continue;
      const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      // Only the actual offer price with a reliably detected currency is accepted;
      // ranges (lowPrice), old prices and guessed currencies are rejected.
      const amount = Number(offer?.price);
      const currency = typeof offer?.priceCurrency === "string" ? offer.priceCurrency.trim() : "";
      return { title: typeof product.name === "string" ? product.name : null, image: typeof product.image === "string" ? product.image : Array.isArray(product.image) ? product.image[0] : null, price: Number.isFinite(amount) && amount > 0 && currency ? { amount, currency } : null };
    }
  } catch { /* Invalid structured data is non-fatal. */ }
  return { title: null, image: null, price: null };
};

const storeName = (url: URL) => ({ "ozon.ru": "Ozon", "wildberries.ru": "Wildberries", "market.yandex.ru": "Яндекс Маркет" }[url.hostname.replace(/^www\./, "")] ?? "Другой магазин");

const copiedTextFallback = (rawInput: string, url: string) => {
  const beforeUrl = rawInput.slice(0, Math.max(0, rawInput.indexOf(url))).trim();
  const line = beforeUrl.split(/\r?\n/).map((value) => value.trim()).find(Boolean) ?? "";
  if (!line) return { title: null, description: null };
  const [first, ...rest] = line.split(",");
  const title = sanitizeGiftPollText(first.trim() || line, 60);
  return { title: title || null, description: cleanImportedDescription(rest.join(","), title) || null };
};
const partial = (extractedUrl: string, resolvedUrl: string, fallback: { title: string | null; description: string | null }, url: URL): GiftLinkPreview => ({
  extractedUrl: cleanProductUrl(extractedUrl) ?? extractedUrl, resolvedUrl: cleanProductUrl(resolvedUrl) ?? resolvedUrl, metadata: { ...fallback, imageUrl: null, price: null, storeName: storeName(url) },
  warnings: ["PAGE_UNAVAILABLE", "METADATA_PARTIAL", "IMAGE_UNAVAILABLE", "PRICE_UNAVAILABLE"]
});

export const previewGiftLink = async (rawInput: string): Promise<GiftLinkPreview> => {
  const extractedUrl = extractProductUrl(rawInput);
  if (!extractedUrl) return { extractedUrl: "", resolvedUrl: "", metadata: { title: null, description: null, imageUrl: null, price: null, storeName: null }, warnings: ["URL_NOT_FOUND"] };
  // Fetch the same public product page without advertising identifiers or
  // accidentally pasted personal/session parameters.
  let current = new URL(cleanProductUrl(extractedUrl) ?? extractedUrl);
  const copied = copiedTextFallback(rawInput, extractedUrl);
  try {
    for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
      await assertPublicUrl(current);
      const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(timeout), headers: { "user-agent": "Slovesto gift preview/1.0", accept: "text/html,application/xhtml+xml" } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location"); if (!location || attempt === MAX_REDIRECTS) throw new Error("TOO_MANY_REDIRECTS");
        const next = new URL(location, current);
        // Ozon's bot protection repeatedly redirects the same product path, only changing __rr.
        // Keep the canonical product URL and offer a manual completion path instead of looping.
        if (next.origin === current.origin && next.pathname === current.pathname) {
          current.searchParams.delete("__rr");
          return partial(extractedUrl, current.toString(), copied, current);
        }
        current = next; continue;
      }
      if (!response.ok) {
        logger.warn("gift_link_preview", "Страница товара вернула ошибку HTTP.", { stage: "http", status: response.status, domain: current.hostname });
        throw new Error("PAGE_UNAVAILABLE");
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html")) {
        logger.warn("gift_link_preview", "Страница товара вернула неподдерживаемый тип ответа.", { stage: "content_type", mimeType: contentType.split(";")[0], domain: current.hostname });
        throw new Error("UNSUPPORTED_CONTENT_TYPE");
      }
      const html = await readLimitedText(response); const structured = jsonLdProduct(html);
      const knownStore = storeName(current);
      const titleContext = { storeName: knownStore === "Другой магазин" ? null : knownStore, hostname: current.hostname };
      const title = cleanImportedTitle(structured.title ?? meta(html, "og:title") ?? meta(html, "twitter:title") ?? titleTag(html), titleContext, 60)
        || sanitizeGiftPollText(copied.title, 60) || null;
      const imageUrl = productImageUrl(structured.image ?? meta(html, "og:image") ?? meta(html, "twitter:image"), current.toString());
      const price = structured.price;
      const description = cleanImportedDescription(meta(html, "og:description") ?? meta(html, "description") ?? copied.description, title) || null;
      const warnings: GiftLinkPreview["warnings"] = [];
      if (!title || !imageUrl || !price) warnings.push("METADATA_PARTIAL");
      if (!imageUrl) warnings.push("IMAGE_UNAVAILABLE"); if (!price) warnings.push("PRICE_UNAVAILABLE");
      return { extractedUrl: cleanProductUrl(extractedUrl) ?? extractedUrl, resolvedUrl: cleanProductUrl(current.toString()) ?? current.toString(), metadata: { title, description, imageUrl, price, storeName: knownStore }, warnings };
    }
  } catch (error) {
    // Log only the failure stage and technical metadata — never page content or user input.
    logger.warn("gift_link_preview", "Импорт страницы товара завершился ошибкой.", { stage: "fetch", code: error instanceof Error ? error.message : "UNKNOWN", domain: current.hostname });
  }
  return partial(extractedUrl, extractedUrl, copied, current);
};
