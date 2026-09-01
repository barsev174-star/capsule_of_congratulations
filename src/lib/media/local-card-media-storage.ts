import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import sharp from "sharp";
import { buildCardMediaFileName } from "@/lib/cards/media";
import type { CardMediaSlot } from "@/lib/cards/types";

export const CARD_UPLOADS_PUBLIC_PREFIX = "/uploads/cards";
export const CARD_UPLOADS_STORAGE_ROOT = join(process.cwd(), "public", "uploads", "cards");

type SaveCardMediaFileInput = {
  cardId: string;
  slot: CardMediaSlot;
  file: File;
};

export type SavedCardMediaFile = {
  fileName: string;
  publicUrl: string;
  storagePath: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  imageWidth: number;
  imageHeight: number;
};

export class CardMediaProcessingError extends Error {
  constructor(message = "Файл не удалось прочитать как изображение. Выберите другой JPG, PNG или WebP.") {
    super(message);
    this.name = "CardMediaProcessingError";
  }
}

const MAX_INPUT_PIXELS = 50_000_000;
const MAX_NORMALIZED_BYTES = 12 * 1024 * 1024;
const supportedFormats = new Set(["jpeg", "png", "webp"]);

const mimeTypeForFormat = (format: string): SavedCardMediaFile["mimeType"] => {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
};

export const sanitizeCardMediaBuffer = async (input: Buffer) => {
  try {
    const source = sharp(input, {
      animated: false,
      failOn: "warning",
      limitInputPixels: MAX_INPUT_PIXELS
    });
    const sourceMetadata = await source.metadata();
    if (!sourceMetadata.format || !supportedFormats.has(sourceMetadata.format) || (sourceMetadata.pages ?? 1) > 1) {
      throw new CardMediaProcessingError();
    }

    const normalized = source.rotate();
    const output = sourceMetadata.format === "png"
      ? await normalized.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
      : sourceMetadata.format === "webp"
        ? await normalized.webp({ quality: 90, effort: 4 }).toBuffer()
        : await normalized.jpeg({ quality: 90, mozjpeg: true }).toBuffer();

    if (output.byteLength > MAX_NORMALIZED_BYTES) {
      throw new CardMediaProcessingError("После безопасной обработки изображение остаётся слишком большим. Уменьшите его и загрузите снова.");
    }
    const metadata = await sharp(output, { failOn: "warning", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!metadata.width || !metadata.height || !metadata.format) throw new CardMediaProcessingError();
    return {
      buffer: output,
      mimeType: mimeTypeForFormat(metadata.format),
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    if (error instanceof CardMediaProcessingError) throw error;
    throw new CardMediaProcessingError();
  }
};

const isInsideUploadsRoot = (storagePath: string) => {
  const resolvedRoot = resolve(CARD_UPLOADS_STORAGE_ROOT);
  const resolvedPath = resolve(storagePath);

  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`);
};

export const saveCardMediaFile = async ({ cardId, slot, file }: SaveCardMediaFileInput): Promise<SavedCardMediaFile> => {
  const normalized = await sanitizeCardMediaBuffer(Buffer.from(await file.arrayBuffer()));
  const fileName = buildCardMediaFileName(slot, file.name, normalized.mimeType);
  const cardDirectory = join(CARD_UPLOADS_STORAGE_ROOT, cardId);
  const storagePath = join(cardDirectory, fileName);
  const publicUrl = `${CARD_UPLOADS_PUBLIC_PREFIX}/${cardId}/${fileName}`;

  await mkdir(cardDirectory, { recursive: true });
  await writeFile(storagePath, normalized.buffer);

  return {
    fileName,
    publicUrl,
    storagePath,
    mimeType: normalized.mimeType,
    sizeBytes: normalized.buffer.byteLength,
    imageWidth: normalized.width,
    imageHeight: normalized.height
  };
};

export const deleteStoredCardMediaFile = async (storagePath: string) => {
  if (!storagePath || !isInsideUploadsRoot(storagePath)) {
    return;
  }

  try {
    await unlink(storagePath);
  } catch {
    // Missing files should not break organizer actions or metadata cleanup.
  }
};
