import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CardDraft } from "@/lib/cards/types";

const dataFilePath = join(process.cwd(), "data", "cards.json");

const ensureDataFile = async () => {
  await mkdir(dirname(dataFilePath), { recursive: true });

  try {
    await readFile(dataFilePath, "utf8");
  } catch {
    await writeFile(dataFilePath, "[]", "utf8");
  }
};

const readCards = async (): Promise<CardDraft[]> => {
  await ensureDataFile();
  const raw = await readFile(dataFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CardDraft[]) : [];
  } catch {
    return [];
  }
};

export const saveCardDraft = async (card: CardDraft) => {
  const existingCards = await readCards();
  existingCards.push(card);
  await writeFile(dataFilePath, JSON.stringify(existingCards, null, 2), "utf8");
};

export const listCardDrafts = async () => readCards();
