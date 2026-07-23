import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type GiftLinkPreview = {
  extractedUrl: string;
  resolvedUrl: string;
  metadata: { title: string | null; description: string | null; imageUrl: string | null; price: { amount: number; currency: string } | null; storeName: string | null };
  warnings: Array<"URL_NOT_FOUND" | "PAGE_UNAVAILABLE" | "METADATA_PARTIAL" | "IMAGE_UNAVAILABLE" | "PRICE_UNAVAILABLE" | "UNSUPPORTED_CONTENT">;
};

const MAX_HTML_BYTES = 750_000;
const MAX_REDIRECTS = 4;
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
      const amount = Number(offer?.price ?? offer?.lowPrice);
      return { title: typeof product.name === "string" ? product.name.trim() : null, image: typeof product.image === "string" ? product.image : Array.isArray(product.image) ? product.image[0] : null, price: Number.isFinite(amount) && amount > 0 ? { amount, currency: String(offer?.priceCurrency ?? "RUB") } : null };
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
  return { title: first.trim().slice(0, 60) || line.slice(0, 60), description: rest.join(",").trim().slice(0, 140) || null };
};
const partial = (extractedUrl: string, resolvedUrl: string, fallback: { title: string | null; description: string | null }, url: URL): GiftLinkPreview => ({
  extractedUrl, resolvedUrl, metadata: { ...fallback, imageUrl: null, price: null, storeName: storeName(url) },
  warnings: ["PAGE_UNAVAILABLE", "METADATA_PARTIAL", "IMAGE_UNAVAILABLE", "PRICE_UNAVAILABLE"]
});

export const previewGiftLink = async (rawInput: string): Promise<GiftLinkPreview> => {
  const extractedUrl = extractProductUrl(rawInput);
  if (!extractedUrl) return { extractedUrl: "", resolvedUrl: "", metadata: { title: null, description: null, imageUrl: null, price: null, storeName: null }, warnings: ["URL_NOT_FOUND"] };
  let current = new URL(extractedUrl);
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
      if (!response.ok) throw new Error("PAGE_UNAVAILABLE");
      if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("UNSUPPORTED_CONTENT_TYPE");
      const html = await readLimitedText(response); const structured = jsonLdProduct(html);
      const title = structured.title ?? meta(html, "og:title") ?? meta(html, "twitter:title") ?? titleTag(html) ?? copied.title;
      const imageUrl = absolute(structured.image ?? meta(html, "og:image") ?? meta(html, "twitter:image"), current.toString());
      const price = structured.price;
      const warnings: GiftLinkPreview["warnings"] = [];
      if (!title || !imageUrl || !price) warnings.push("METADATA_PARTIAL");
      if (!imageUrl) warnings.push("IMAGE_UNAVAILABLE"); if (!price) warnings.push("PRICE_UNAVAILABLE");
      return { extractedUrl, resolvedUrl: current.toString(), metadata: { title, description: copied.description, imageUrl, price, storeName: storeName(current) }, warnings };
    }
  } catch { /* Return a usable, safe-to-save link instead of leaking internals. */ }
  return partial(extractedUrl, extractedUrl, copied, current);
};
