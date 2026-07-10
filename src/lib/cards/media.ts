import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { CardMediaSlot } from "@/lib/cards/types";

export const CARD_MEDIA_MAX_BYTES = 6 * 1024 * 1024;
export const CARD_MEDIA_MAX_COUNT = 7;

const mimeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export const isSupportedCardMediaMimeType = (mimeType: string) => mimeType in mimeToExtension;

export const resolveCardMediaExtension = (fileName: string, mimeType: string) => {
  const byMimeType = mimeToExtension[mimeType];

  if (byMimeType) {
    return byMimeType;
  }

  const fallbackExtension = extname(fileName).toLowerCase();
  return fallbackExtension || ".bin";
};

export const buildCardMediaFileName = (slot: CardMediaSlot, originalFileName: string, mimeType: string) => {
  const extension = resolveCardMediaExtension(originalFileName, mimeType);
  return `${slot}-${Date.now()}-${randomUUID()}${extension}`;
};

export const validateCardMediaFile = (file: File) => {
  if (file.size <= 0) {
    return "Выберите файл для загрузки.";
  }

  if (!isSupportedCardMediaMimeType(file.type)) {
    return "Пока поддерживаются только JPG, PNG и WebP.";
  }

  if (file.size > CARD_MEDIA_MAX_BYTES) {
    return "Файл слишком большой. Пока держим лимит до 6 МБ.";
  }

  return null;
};
