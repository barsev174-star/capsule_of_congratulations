import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const GIFT_OPTION_UPLOADS_STORAGE_ROOT = join(process.cwd(), "public", "uploads", "gift-options");
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const allowed = new Map([["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"]]);

export const saveGiftOptionUpload = async (cardId: string, file: File) => {
  const extension = allowed.get(file.type);
  if (!extension || !file.size || file.size > MAX_IMAGE_BYTES) throw new Error("invalid image");
  const directory = join(GIFT_OPTION_UPLOADS_STORAGE_ROOT, cardId); const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  await mkdir(directory, { recursive: true }); await writeFile(join(directory, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/gift-options/${cardId}/${fileName}`;
};

const privateAddress = (address: string) => {
  if (address.includes(":")) return address === "::1" || /^(fc|fd|fe8|fe9|fea|feb)/i.test(address);
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
};
const assertPublicImageUrl = async (url: URL) => {
  if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("blocked");
  const records = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => privateAddress(record.address))) throw new Error("blocked");
};

export const importGiftOptionImage = async (cardId: string, sourceUrl: string) => {
  let current = new URL(sourceUrl);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicImageUrl(current);
    const response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(7_000), headers: { "user-agent": "Slovesto gift image import/1.0", accept: "image/avif,image/webp,image/apng,image/*" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location"); if (!location || redirects === 3) throw new Error("redirect"); current = new URL(location, current); continue;
    }
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
    const extension = allowed.get(contentType); const size = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || !extension || size > MAX_IMAGE_BYTES) throw new Error("invalid image");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("invalid image");
    const directory = join(GIFT_OPTION_UPLOADS_STORAGE_ROOT, cardId); const fileName = `${Date.now()}-${randomUUID()}${extension}`;
    await mkdir(directory, { recursive: true }); await writeFile(join(directory, fileName), bytes);
    return `/uploads/gift-options/${cardId}/${fileName}`;
  }
  throw new Error("redirect");
};
