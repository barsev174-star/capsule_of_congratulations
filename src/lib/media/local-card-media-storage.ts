import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
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
};

const isInsideUploadsRoot = (storagePath: string) => {
  const resolvedRoot = resolve(CARD_UPLOADS_STORAGE_ROOT);
  const resolvedPath = resolve(storagePath);

  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`);
};

export const saveCardMediaFile = async ({ cardId, slot, file }: SaveCardMediaFileInput): Promise<SavedCardMediaFile> => {
  const fileName = buildCardMediaFileName(slot, file.name, file.type);
  const cardDirectory = join(CARD_UPLOADS_STORAGE_ROOT, cardId);
  const storagePath = join(cardDirectory, fileName);
  const publicUrl = `${CARD_UPLOADS_PUBLIC_PREFIX}/${cardId}/${fileName}`;

  await mkdir(cardDirectory, { recursive: true });
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));

  return {
    fileName,
    publicUrl,
    storagePath
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
