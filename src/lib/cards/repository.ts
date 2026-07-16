import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isPostgresConfigured } from "@/lib/db/postgres";
import * as postgresRepository from "@/lib/cards/repository-postgres";
import type { CardDraft, CardMediaAsset, CardStatus, Contribution } from "@/lib/cards/types";
import type { CardTemplateId } from "@/lib/cards/templates";
import { deleteStoredCardMediaFile } from "@/lib/media/local-card-media-storage";
import { CARD_CONTRIBUTION_LIMIT, ContributionLimitReachedError } from "@/lib/contributions/limits";
import type {
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMainGreetingSettings,
  FinalCardMemorySettings,
  FinalCardMessageSettings
} from "@/lib/final-card/types";

const cardsFilePath = join(process.cwd(), "data", "cards.json");
const contributionsFilePath = join(process.cwd(), "data", "contributions.json");
const mediaAssetsFilePath = join(process.cwd(), "data", "media-assets.json");

const defaultFinalMessageSettings: FinalCardMessageSettings = {
  layoutMode: "grid-2",
  mediaLayout: "portrait",
  mediaSlots: [],
  mediaAssetIds: [],
  showAllLink: true
};

const defaultFinalMemorySettings: FinalCardMemorySettings = {
  title: "Моменты",
  description: "Фото, которые хочется сохранить",
  mediaSlots: [],
  mediaAssetIds: [],
  photoCount: 3
};

const defaultFinalMainGreetingSettings: FinalCardMainGreetingSettings = {
  contributionId: null
};

const normalizeCard = (card: CardDraft): CardDraft => ({
  ...card,
  occasionText: card.occasionText ?? card.description ?? card.occasion,
  signature: card.signature ?? null,
  finalBlockSettings: card.finalBlockSettings ?? null,
  finalBlockOrder: card.finalBlockOrder ?? null,
  finalMainGreetingSettings: card.finalMainGreetingSettings
    ? {
        ...defaultFinalMainGreetingSettings,
        ...card.finalMainGreetingSettings
      }
    : defaultFinalMainGreetingSettings,
  finalMemorySettings: card.finalMemorySettings
    ? {
        ...defaultFinalMemorySettings,
        ...card.finalMemorySettings
      }
    : defaultFinalMemorySettings,
  finalMessageSettings: card.finalMessageSettings
    ? {
        ...defaultFinalMessageSettings,
        ...card.finalMessageSettings
      }
    : defaultFinalMessageSettings,
  status: card.status ?? "draft",
  deletedAt: card.deletedAt ?? null,
  purgeAfter: card.purgeAfter ?? null
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
    authorAvatarUrl: contribution.authorAvatarUrl ?? null,
    participantTokenHash: contribution.participantTokenHash ?? null,
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

export const saveCardDraft = async (card: CardDraft) => {
  if (isPostgresConfigured()) {
    return postgresRepository.saveCardDraft(card);
  }

  const existingCards = await readCards();
  existingCards.push(card);
  await writeFile(cardsFilePath, JSON.stringify(existingCards, null, 2), "utf8");
};

export const listCardDrafts = async () => {
  const cards = isPostgresConfigured() ? await postgresRepository.listCardDrafts() : await readCards();
  return cards.filter((card) => card.purgedAt === null || card.purgedAt === undefined);
};

export const listCardDraftsByOrganizerEmail = async (email: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.listCardDraftsByOrganizerEmail(email);
  }
  const normalizedEmail = email.trim().toLowerCase();
  return (await readCards())
    .filter(
      (card) =>
        (card.purgedAt === null || card.purgedAt === undefined) &&
        card.organizerEmail.trim().toLowerCase() === normalizedEmail
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const getCardDraftByPublicSlug = async (publicSlug: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.getCardDraftByPublicSlug(publicSlug);
  }

  const cards = await readCards();
  return cards.find((card) => card.publicSlug === publicSlug && !card.deletedAt && !card.purgedAt) ?? null;
};

export const getCardDraftByManageToken = async (manageToken: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.getCardDraftByManageToken(manageToken);
  }

  const cards = await readCards();
  return cards.find((card) => card.manageToken === manageToken && !card.deletedAt && !card.purgedAt) ?? null;
};

export const getCardDraftById = async (cardId: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.getCardDraftById(cardId);
  }

  const cards = await readCards();
  return cards.find((card) => card.id === cardId && !card.purgedAt) ?? null;
};

export const softDeleteCard = async (cardId: string) => {
  if (isPostgresConfigured()) return postgresRepository.softDeleteCard(cardId);
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId && !card.deletedAt);
  if (index === -1) return null;
  const now = new Date();
  const updated = {
    ...cards[index],
    deletedAt: now.toISOString(),
    purgeAfter: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: now.toISOString()
  };
  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const restoreDeletedCard = async (cardId: string) => {
  if (isPostgresConfigured()) return postgresRepository.restoreDeletedCard(cardId);
  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId && card.deletedAt);
  if (index === -1 || !cards[index].purgeAfter || Date.parse(cards[index].purgeAfter) <= Date.now()) return null;
  const updated = { ...cards[index], deletedAt: null, purgeAfter: null, updatedAt: new Date().toISOString() };
  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const purgeExpiredCards = async (now = new Date()) => {
  const draftCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (isPostgresConfigured()) {
    const candidates = await postgresRepository.listCardRetentionCandidates(draftCutoff, now);
    for (const candidate of candidates) {
      const paths = await postgresRepository.purgeCardToTombstone(candidate.id);
      await Promise.all(paths.map((path) => deleteStoredCardMediaFile(path)));
    }
    return candidates;
  }

  const cards = await readCards();
  const contributions = await readContributions();
  const assets = await readMediaAssets();
  const candidates = cards
    .filter((card) =>
      (card.deletedAt && card.purgeAfter && Date.parse(card.purgeAfter) <= now.getTime()) ||
      (!card.deletedAt &&
        card.status !== "published" &&
        Date.parse(card.updatedAt) < draftCutoff.getTime() &&
        !contributions.some((item) => item.cardId === card.id && Date.parse(item.updatedAt) >= draftCutoff.getTime()) &&
        !assets.some((item) => item.cardId === card.id && Date.parse(item.updatedAt) >= draftCutoff.getTime()))
    )
    .map((card) => ({
      id: card.id,
      reason: card.deletedAt ? "deleted" as const : "inactive_draft" as const
    }));
  if (candidates.length === 0) return candidates;
  const ids = new Set(candidates.map((item) => item.id));
  await Promise.all(assets.filter((asset) => ids.has(asset.cardId)).map((asset) => deleteStoredCardMediaFile(asset.storagePath)));
  const purgedAt = now.toISOString();
  const tombstones = cards.map((card) => {
    if (!ids.has(card.id)) return card;

    // Keep only the internal identifier and lifecycle/accounting state. This mirrors the
    // PostgreSQL tombstone and prevents a JSON-backed development environment from
    // retaining content or usable public/manage identifiers after purge.
    return {
      ...card,
      publicSlug: null,
      manageToken: null,
      finalSlug: null,
      recipientName: null,
      occasion: null,
      occasionText: null,
      fromLabel: null,
      organizerName: null,
      organizerEmail: null,
      eventDate: null,
      description: null,
      signature: null,
      templateId: null,
      finalBlockSettings: null,
      finalBlockOrder: null,
      finalMessageSettings: null,
      finalMainGreetingSettings: null,
      finalMemorySettings: null,
      isHidden: true,
      hiddenAt: card.hiddenAt ?? purgedAt,
      deletedAt: card.deletedAt ?? purgedAt,
      purgeAt: null,
      purgeAfter: null,
      purgedAt,
      updatedAt: purgedAt
    } as unknown as CardDraft;
  });
  await writeFile(cardsFilePath, JSON.stringify(tombstones, null, 2), "utf8");
  await writeFile(contributionsFilePath, JSON.stringify(contributions.filter((item) => !ids.has(item.cardId)), null, 2), "utf8");
  await writeFile(mediaAssetsFilePath, JSON.stringify(assets.filter((asset) => !ids.has(asset.cardId)), null, 2), "utf8");
  return candidates;
};

export const updateCardFinalBlockSettings = async (
  cardId: string,
  finalBlockSettings: FinalCardBlockSettings,
  finalBlockOrder: FinalCardBlockOrder | null
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardFinalBlockSettings(cardId, finalBlockSettings, finalBlockOrder);
  }

  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    finalBlockSettings,
    finalBlockOrder,
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
  finalBlockOrder: FinalCardBlockOrder | null,
  finalMessageSettings: FinalCardMessageSettings,
  finalMainGreetingSettings: FinalCardMainGreetingSettings,
  finalMemorySettings: FinalCardMemorySettings
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardFinalPresentationSettings(
      cardId,
      templateId,
      finalBlockSettings,
      finalBlockOrder,
      finalMessageSettings,
      finalMainGreetingSettings,
      finalMemorySettings
    );
  }

  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    templateId,
    finalBlockSettings,
    finalBlockOrder,
    finalMessageSettings,
    finalMainGreetingSettings,
    finalMemorySettings,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const updateCardMainGreetingSettings = async (
  cardId: string,
  finalMainGreetingSettings: FinalCardMainGreetingSettings
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardMainGreetingSettings(cardId, finalMainGreetingSettings);
  }

  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    finalMainGreetingSettings,
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
    | "signature"
  >
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardDraftBasics(cardId, basics);
  }

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

export const updateCardStatus = async (cardId: string, status: CardStatus) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardStatus(cardId, status);
  }

  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    status,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const updateCardPaymentStatus = async (cardId: string, paymentStatus: CardDraft["paymentStatus"]) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardPaymentStatus(cardId, paymentStatus);
  }

  const cards = await readCards();
  const index = cards.findIndex((card) => card.id === cardId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...cards[index],
    paymentStatus,
    updatedAt: new Date().toISOString()
  };

  cards[index] = updated;
  await writeFile(cardsFilePath, JSON.stringify(cards, null, 2), "utf8");
  return updated;
};

export const listCardMediaAssetsByCardId = async (cardId: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.listCardMediaAssetsByCardId(cardId);
  }

  const assets = await readMediaAssets();
  return assets
    .filter((item) => item.cardId === cardId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const upsertCardMediaAsset = async (asset: CardMediaAsset) => {
  if (isPostgresConfigured()) {
    return postgresRepository.upsertCardMediaAsset(asset);
  }

  const assets = await readMediaAssets();
  const existing = assets.find((item) => item.cardId === asset.cardId && item.slot === asset.slot);
  const nextAssets = assets.filter((item) => item.id !== existing?.id);

  if (existing && existing.storagePath !== asset.storagePath) {
    await deleteStoredCardMediaFile(existing.storagePath);
  }

  nextAssets.push(asset);
  await writeFile(mediaAssetsFilePath, JSON.stringify(nextAssets, null, 2), "utf8");
  return asset;
};

export const updateCardMediaAssetCaption = async (
  assetId: string,
  captionTitle: string,
  captionSubtitle: string,
  slot?: CardMediaAsset["slot"]
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateCardMediaAssetCaption(assetId, captionTitle, captionSubtitle, slot);
  }

  const assets = await readMediaAssets();
  const index = assets.findIndex((item) => item.id === assetId);

  if (index === -1) {
    return null;
  }

  const updated = {
    ...assets[index],
    slot: slot ?? assets[index].slot,
    captionTitle,
    captionSubtitle,
    updatedAt: new Date().toISOString()
  };

  assets[index] = updated;
  await writeFile(mediaAssetsFilePath, JSON.stringify(assets, null, 2), "utf8");
  return updated;
};

export const swapCardMediaAssetSlots = async (cardId: string, leftAssetId: string, rightAssetId: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.swapCardMediaAssetSlots(cardId, leftAssetId, rightAssetId);
  }

  const assets = await readMediaAssets();
  const leftIndex = assets.findIndex((item) => item.cardId === cardId && item.id === leftAssetId);
  const rightIndex = assets.findIndex((item) => item.cardId === cardId && item.id === rightAssetId);

  if (leftIndex === -1 || rightIndex === -1) {
    return [];
  }

  const now = new Date().toISOString();
  const leftSlot = assets[leftIndex].slot;
  assets[leftIndex] = { ...assets[leftIndex], slot: assets[rightIndex].slot, updatedAt: now };
  assets[rightIndex] = { ...assets[rightIndex], slot: leftSlot, updatedAt: now };

  await writeFile(mediaAssetsFilePath, JSON.stringify(assets, null, 2), "utf8");
  return [assets[leftIndex], assets[rightIndex]];
};

export const deleteCardMediaAsset = async (assetId: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.deleteCardMediaAsset(assetId);
  }

  const assets = await readMediaAssets();
  const current = assets.find((item) => item.id === assetId);

  if (!current) {
    return null;
  }

  const nextAssets = assets.filter((item) => item.id !== assetId);
  await deleteStoredCardMediaFile(current.storagePath);
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
  if (isPostgresConfigured()) {
    return postgresRepository.saveContribution(contribution);
  }

  const contributions = await readContributions();
  const activeCount = contributions.filter(
    (item) => item.cardId === contribution.cardId && item.status !== "deleted"
  ).length;
  if (activeCount >= CARD_CONTRIBUTION_LIMIT) {
    throw new ContributionLimitReachedError();
  }
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
  if (isPostgresConfigured()) {
    return postgresRepository.listContributionsByCardId(cardId);
  }

  const contributions = await readContributions();
  return contributions
    .filter((item) => item.cardId === cardId && item.status === "visible")
    .sort(compareContributions);
};

export const listAllContributionsByCardId = async (cardId: string) => {
  if (isPostgresConfigured()) {
    return postgresRepository.listAllContributionsByCardId(cardId);
  }

  const contributions = await readContributions();
  return contributions.filter((item) => item.cardId === cardId).sort(compareContributions);
};

export const updateContributionStatus = async (
  contributionId: string,
  status: Contribution["status"]
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateContributionStatus(contributionId, status);
  }

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
  if (isPostgresConfigured()) {
    return postgresRepository.moveContribution(contributionId, direction);
  }

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

export const reorderContributions = async (cardId: string, orderedContributionIds: string[]) => {
  if (isPostgresConfigured()) {
    return postgresRepository.reorderContributions(cardId, orderedContributionIds);
  }

  const contributions = await readContributions();
  const siblings = contributions.filter((item) => item.cardId === cardId).sort(compareContributions);

  if (siblings.length === 0) {
    return [];
  }

  const siblingIds = new Set(siblings.map((item) => item.id));
  const normalizedOrder = orderedContributionIds.filter((id) => siblingIds.has(id));

  if (normalizedOrder.length !== siblings.length) {
    for (const item of siblings) {
      if (!normalizedOrder.includes(item.id)) {
        normalizedOrder.push(item.id);
      }
    }
  }

  const orderMap = new Map(normalizedOrder.map((id, index) => [id, index]));
  const nextContributions = contributions.map((item) => {
    if (item.cardId !== cardId) {
      return item;
    }

    const nextOrder = orderMap.get(item.id);
    if (typeof nextOrder !== "number") {
      return item;
    }

    return {
      ...item,
      sortOrder: nextOrder,
      updatedAt: new Date().toISOString()
    };
  });

  await writeFile(contributionsFilePath, JSON.stringify(nextContributions, null, 2), "utf8");
  return nextContributions.filter((item) => item.cardId === cardId).sort(compareContributions);
};

export const updateContributionMessage = async (
  contributionId: string,
  message: Contribution["message"]
) => {
  if (isPostgresConfigured()) {
    return postgresRepository.updateContributionMessage(contributionId, message);
  }

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
