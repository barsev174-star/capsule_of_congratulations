import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CardDraft, Contribution } from "@/lib/cards/types";

const cardsFilePath = join(process.cwd(), "data", "cards.json");
const contributionsFilePath = join(process.cwd(), "data", "contributions.json");

const ensureJsonFile = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
};

const readCards = async (): Promise<CardDraft[]> => {
  await ensureJsonFile(cardsFilePath);
  const raw = await readFile(cardsFilePath, "utf8");

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
  await writeFile(cardsFilePath, JSON.stringify(existingCards, null, 2), "utf8");
};

export const listCardDrafts = async () => readCards();

export const getCardDraftByPublicSlug = async (publicSlug: string) => {
  const cards = await readCards();
  return cards.find((card) => card.publicSlug === publicSlug) ?? null;
};

export const getCardDraftByManageToken = async (manageToken: string) => {
  const cards = await readCards();
  return cards.find((card) => card.manageToken === manageToken) ?? null;
};

export const getCardDraftById = async (cardId: string) => {
  const cards = await readCards();
  return cards.find((card) => card.id === cardId) ?? null;
};

const readContributions = async (): Promise<Contribution[]> => {
  await ensureJsonFile(contributionsFilePath);
  const raw = await readFile(contributionsFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Contribution[]) : [];
  } catch {
    return [];
  }
};

export const saveContribution = async (contribution: Contribution) => {
  const contributions = await readContributions();
  contributions.push(contribution);
  await writeFile(contributionsFilePath, JSON.stringify(contributions, null, 2), "utf8");
};

export const listContributionsByCardId = async (cardId: string) => {
  const contributions = await readContributions();
  return contributions.filter((item) => item.cardId === cardId && item.status === "visible");
};

export const listAllContributionsByCardId = async (cardId: string) => {
  const contributions = await readContributions();
  return contributions.filter((item) => item.cardId === cardId);
};

export const updateContributionStatus = async (
  contributionId: string,
  status: Contribution["status"]
) => {
  const contributions = await readContributions();
  const index = contributions.findIndex((item) => item.id === contributionId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...contributions[index],
    status,
    updatedAt: new Date().toISOString()
  };

  contributions[index] = updated;
  await writeFile(contributionsFilePath, JSON.stringify(contributions, null, 2), "utf8");
  return updated;
};

export const updateContributionMessage = async (
  contributionId: string,
  message: Contribution["message"]
) => {
  const contributions = await readContributions();
  const index = contributions.findIndex((item) => item.id === contributionId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...contributions[index],
    message,
    updatedAt: new Date().toISOString()
  };

  contributions[index] = updated;
  await writeFile(contributionsFilePath, JSON.stringify(contributions, null, 2), "utf8");
  return updated;
};
