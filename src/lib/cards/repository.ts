import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CardDraft, CardMediaAsset, Contribution } from "@/lib/cards/types";
import type { CardTemplateId } from "@/lib/cards/templates";
import type { FinalCardBlockSettings, FinalCardMessageSettings } from "@/lib/final-card/types";

const cardsFilePath = join(process.cwd(), "data", "cards.json");
const contributionsFilePath = join(process.cwd(), "data", "contributions.json");
const mediaAssetsFilePath = join(process.cwd(), "data", "media-assets.json");

const defaultFinalMessageSettings: FinalCardMessageSettings = {
  layoutMode: "grid-2",
  mediaLayout: "portrait",
  showAllLink: true
};

const normalizeCard = (card: CardDraft): CardDraft => ({
  ...card,
  occasionText: card.occasionText ?? card.description ?? card.occasion,
  finalBlockSettings: card.finalBlockSettings ?? null,
  finalMessageSettings: card.finalMessageSettings
    ? {
        ...defaultFinalMessageSettings,
        ...card.finalMessageSettings
      }
    : defaultFinalMessageSettings
});

const compareContributions = (left: Contribution, right: Contribution) => {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return left.createdAt.localeCompare(right.createdAt);
};

const normalizeContribution = (
  contribution: Contribution,
  index: number,
  contributions: Contribution[]
): Contribution => {
  const sameCard = contributions
    .filter((item) => item.cardId === contribution.cardId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const fallbackOrder = sameCard.findIndex((item) => item.id === contribution.id);

  return {
    ...contribution,
    sortOrder:
      typeof contribution.sortOrder === "number" && Number.isFinite(contribution.sortOrder)
        ? contribution.sortOrder
        : fallbackOrder >= 0
          ? fallbackOrder
          : index
  };
};

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
    return Array.isArray(parsed) ? (parsed as CardDraft[]).map(normalizeCard) : [];
  } catch {
    return [];
  }
};

const readMediaAssets = async (): Promise<CardMediaAsset[]> => {
  await ensureJsonFile(mediaAssetsFilePath);
  const raw = await readFile(mediaAssetsFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as Array<Partial<CardMediaAsset>>).map((item) => ({
          id: item.id ?? "",
          cardId: item.cardId ?? "",
          slot: item.slot ?? "portrait",
          publicUrl: item.publicUrl ?? "",
          storagePath: item.storagePath ?? "",
          fileName: item.fileName ?? "",
          mimeType: item.mimeType ?? "",
          sizeBytes: item.sizeBytes ?? 0,
          captionTitle: item.captionTitle ?? "",
          captionSubtitle: item.captionSubtitle ?? (item as { caption?: string }).caption ?? "",
          createdAt: item.createdAt ?? new Date().toISOString(),
          updatedAt: item.updatedAt ?? new Date().toISOString()
        }))
      : [];
  } catch {
    return [];
  }
};

const removeStoredMediaFile = async (storagePath: string) => {
  try {
    await unlink(storagePath);
  } catch {
    // Ignore missing files so organizer actions stay resilient.
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

export const updateCardFinalBlockSettings = async (
  cardId: string,
  finalBlockSettings: FinalCardBlockSettings
) => {
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    finalBlockSettings,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const updateCardFinalPresentationSettings = async (
  cardId: string,
  templateId: CardTemplateId,
  finalBlockSettings: FinalCardBlockSettings,
  finalMessageSettings: FinalCardMessageSettings
) => {
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    templateId,
    finalBlockSettings,
    finalMessageSettings,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const updateCardDraftBasics = async (
  cardId: string,
  basics: Pick<
    CardDraft,
    | "recipientName"
    | "occasion"
    | "occasionText"
    | "fromLabel"
    | "organizerName"
    | "organizerEmail"
    | "eventDate"
    | "description"
  >
) => {
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    ...basics,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const listCardMediaAssetsByCardId = async (cardId: string) => {
  const assets = await readMediaAssets();
  return assets
    .filter((item) => item.cardId === cardId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const upsertCardMediaAsset = async (asset: CardMediaAsset) => {
  const assets = await readMediaAssets();
  const existing = assets.find((item) => item.cardId === asset.cardId && item.slot === asset.slot);
  const nextAssets = assets.filter((item) => item.id !== existing?.id);

  if (existing && existing.storagePath !== asset.storagePath) {
    await removeStoredMediaFile(existing.storagePath);
  }

  nextAssets.push(asset);
  await writeFile(mediaAssetsFilePath, JSON.stringify(nextAssets, null, 2), "utf8");
  return asset;
};

export const updateCardMediaAssetCaption = async (
  assetId: string,
  captionTitle: string,
  captionSubtitle: string
) => {
  const assets = await readMediaAssets();
  const index = assets.findIndex((item) => item.id === assetId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...assets[index],
    captionTitle,
    captionSubtitle,
    updatedAt: new Date().toISOString()
  };

  assets[index] = updated;
  await writeFile(mediaAssetsFilePath, JSON.stringify(assets, null, 2), "utf8");
  return updated;
};

export const deleteCardMediaAsset = async (assetId: string) => {
  const assets = await readMediaAssets();
  const current = assets.find((item) => item.id === assetId);

  if (!current) {
    return null;
  }

  const nextAssets = assets.filter((item) => item.id !== assetId);
  await removeStoredMediaFile(current.storagePath);
  await writeFile(mediaAssetsFilePath, JSON.stringify(nextAssets, null, 2), "utf8");
  return current;
};

const readContributions = async (): Promise<Contribution[]> => {
  await ensureJsonFile(contributionsFilePath);
  const raw = await readFile(contributionsFilePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as Contribution[]).map((item, index, list) => normalizeContribution(item, index, list))
      : [];
  } catch {
    return [];
  }
};

export const saveContribution = async (contribution: Contribution) => {
  const contributions = await readContributions();
  const maxSortOrder = contributions
    .filter((item) => item.cardId === contribution.cardId)
    .reduce((max, item) => Math.max(max, item.sortOrder), -1);

  contributions.push({
    ...contribution,
    sortOrder:
      typeof contribution.sortOrder === "number" && Number.isFinite(contribution.sortOrder)
        ? contribution.sortOrder
        : maxSortOrder + 1
  });
  await writeFile(contributionsFilePath, JSON.stringify(contributions, null, 2), "utf8");
};

export const listContributionsByCardId = async (cardId: string) => {
  const contributions = await readContributions();
  return contributions
    .filter((item) => item.cardId === cardId && item.status === "visible")
    .sort(compareContributions);
};

export const listAllContributionsByCardId = async (cardId: string) => {
  const contributions = await readContributions();
  return contributions.filter((item) => item.cardId === cardId).sort(compareContributions);
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

export const moveContribution = async (contributionId: string, direction: "up" | "down") => {
  const contributions = await readContributions();
  const current = contributions.find((item) => item.id === contributionId);

  if (!current) {
    return null;
  }

  const siblings = contributions.filter((item) => item.cardId === current.cardId).sort(compareContributions);
  const currentIndex = siblings.findIndex((item) => item.id === contributionId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex === -1 || targetIndex < 0 || targetIndex >= siblings.length) {
    return current;
  }

  const target = siblings[targetIndex];
  const currentSortOrder = current.sortOrder;

  const nextContributions = contributions.map((item) => {
    if (item.id === current.id) {
      return {
        ...item,
        sortOrder: target.sortOrder,
        updatedAt: new Date().toISOString()
      };
    }

    if (item.id === target.id) {
      return {
        ...item,
        sortOrder: currentSortOrder,
        updatedAt: new Date().toISOString()
      };
    }

    return item;
  });

  await writeFile(contributionsFilePath, JSON.stringify(nextContributions, null, 2), "utf8");
  return nextContributions.find((item) => item.id === contributionId) ?? null;
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
