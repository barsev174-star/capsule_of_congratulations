import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, extname, join, resolve, sep } from "node:path";
import sharp from "sharp";

// Public derivatives are deliberately kept outside Next's static `public/` tree.
// They are served only after the share token and lifecycle have been checked.
export const PUBLIC_SHARE_MEDIA_STORAGE_ROOT = join(process.cwd(), "data", "public-share-media");

type PublicSharePhotoSource = {
  publicShareId: string;
  sourceStoragePath: string;
  sourceFileName: string;
  mimeType: string;
  normalizeOrientation?: boolean;
};

export type StoredPublicSharePhoto = {
  storagePath: string;
  fileName: string;
  sizeBytes: number;
};

const isInsideRoot = (path: string) => {
  const root = resolve(PUBLIC_SHARE_MEDIA_STORAGE_ROOT);
  const candidate = resolve(path);
  return candidate === root || candidate.startsWith(`${root}${sep}`);
};

const stripJpegMetadata = (input: Buffer) => {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return input;
  const chunks: Buffer[] = [input.subarray(0, 2)];
  let offset = 2;
  while (offset < input.length) {
    if (input[offset] !== 0xff || offset + 1 >= input.length) return input;
    const marker = input[offset + 1];
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(input.subarray(offset));
      return Buffer.concat(chunks);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(input.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }
    if (offset + 4 > input.length) return input;
    const length = input.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > input.length) return input;
    // APP segments are where EXIF, XMP and other camera metadata lives.
    if (marker < 0xe0 || marker > 0xef) chunks.push(input.subarray(offset, offset + 2 + length));
    offset += 2 + length;
  }
  return Buffer.concat(chunks);
};

const stripPngMetadata = (input: Buffer) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (input.length < signature.length || !input.subarray(0, signature.length).equals(signature)) return input;
  const chunks: Buffer[] = [signature];
  let offset = signature.length;
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > input.length) return input;
    const type = input.subarray(offset + 4, offset + 8).toString("ascii");
    if (!["eXIf", "tEXt", "zTXt", "iTXt", "tIME"].includes(type)) chunks.push(input.subarray(offset, end));
    offset = end;
    if (type === "IEND") return Buffer.concat(chunks);
  }
  return input;
};

const stripWebpMetadata = (input: Buffer) => {
  if (input.length < 12 || input.subarray(0, 4).toString("ascii") !== "RIFF" || input.subarray(8, 12).toString("ascii") !== "WEBP") return input;
  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset + 8 <= input.length) {
    const type = input.subarray(offset, offset + 4).toString("ascii");
    const length = input.readUInt32LE(offset + 4);
    const paddedLength = length + (length % 2);
    const end = offset + 8 + paddedLength;
    if (end > input.length) return input;
    if (type !== "EXIF" && type !== "XMP ") chunks.push(input.subarray(offset, end));
    offset = end;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
};

const stripMetadata = (input: Buffer, mimeType: string) => {
  if (mimeType === "image/jpeg") return stripJpegMetadata(input);
  if (mimeType === "image/png") return stripPngMetadata(input);
  if (mimeType === "image/webp") return stripWebpMetadata(input);
  return input;
};

export const sanitizePublicSharePhoto = async (
  input: Buffer,
  mimeType: string,
  normalizeOrientation = false
) => {
  if (!normalizeOrientation) return stripMetadata(input, mimeType);

  const pipeline = sharp(input).rotate();
  if (mimeType === "image/jpeg") return pipeline.jpeg({ quality: 95 }).toBuffer();
  if (mimeType === "image/png") return pipeline.png().toBuffer();
  if (mimeType === "image/webp") return pipeline.webp({ quality: 95 }).toBuffer();
  return stripMetadata(input, mimeType);
};

export const createPublicSharePhotoDerivative = async ({ publicShareId, sourceStoragePath, sourceFileName, mimeType, normalizeOrientation = false }: PublicSharePhotoSource): Promise<StoredPublicSharePhoto> => {
  const source = await readFile(sourceStoragePath);
  const sanitized = await sanitizePublicSharePhoto(source, mimeType, normalizeOrientation);
  const extension = extname(sourceFileName).toLowerCase() || (mimeType === "image/png" ? ".png" : mimeType === "image/webp" ? ".webp" : ".jpg");
  const fileName = `${randomUUID()}${extension}`;
  const directory = join(PUBLIC_SHARE_MEDIA_STORAGE_ROOT, publicShareId);
  const storagePath = join(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(storagePath, sanitized);
  return { storagePath, fileName, sizeBytes: sanitized.byteLength };
};

export const readPublicSharePhotoDerivative = async (storagePath: string) => {
  if (!storagePath || !isInsideRoot(storagePath)) return null;
  try { return await readFile(storagePath); } catch { return null; }
};

export const deletePublicSharePhotoDerivative = async (storagePath: string) => {
  if (!storagePath || !isInsideRoot(storagePath)) return;
  try { await unlink(storagePath); } catch { /* A missing derivative is safe to ignore. */ }
};

export const getPublicSharePhotoContentType = (fileName: string) => {
  const extension = extname(basename(fileName)).toLowerCase();
  return extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
};

export const preparePublicSharePhotoResponse = async ({
  file,
  fileName,
  exportCompatible
}: {
  file: Buffer;
  fileName: string;
  exportCompatible: boolean;
}) => {
  const contentType = getPublicSharePhotoContentType(fileName);
  if (!exportCompatible || contentType !== "image/webp") {
    return { file, contentType };
  }

  const png = await sharp(file).png().toBuffer();
  return { file: png, contentType: "image/png" as const };
};
