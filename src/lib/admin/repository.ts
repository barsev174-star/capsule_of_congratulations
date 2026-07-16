import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getCardDraftById,
  listAllContributionsByCardId,
  listCardDrafts,
  listCardMediaAssetsByCardId,
  updateContributionStatus
} from "@/lib/cards/repository";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type {
  CardDraft,
  CardMediaAsset,
  CollectionStatus,
  Contribution,
  ContributionStatus,
  DeliveryStatus,
  PaymentStatus
} from "@/lib/cards/types";

const cardsFilePath = join(process.cwd(), "data", "cards.json");
const contributionsFilePath = join(process.cwd(), "data", "contributions.json");
const mediaAssetsFilePath = join(process.cwd(), "data", "media-assets.json");

const readJsonFile = async <T>(filePath: string): Promise<T[]> => {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);

export type AdminDashboardStats = {
  totalCards: number;
  cardsByPaymentStatus: Record<PaymentStatus, number>;
  cardsByCollectionStatus: Record<CollectionStatus, number>;
  cardsByDeliveryStatus: Record<DeliveryStatus, number>;
  totalContributions: number;
  visibleContributions: number;
  hiddenContributions: number;
  deletedContributions: number;
  totalMediaAssets: number;
  recentCards: Array<
    Pick<
      CardDraft,
      "id" | "recipientName" | "organizerEmail" | "paymentStatus" | "collectionStatus" | "deliveryStatus" | "createdAt"
    >
  >;
};

const emptyPaymentCounts = (): Record<PaymentStatus, number> => ({
  UNPAID: 0,
  PAID: 0,
  REFUNDED: 0,
  REVOKED: 0
});

const emptyCollectionCounts = (): Record<CollectionStatus, number> => ({
  DRAFT: 0,
  OPEN: 0,
  CLOSED: 0
});

const emptyDeliveryCounts = (): Record<DeliveryStatus, number> => ({
  PREPARING: 0,
  DELIVERED: 0
});

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  if (isPostgresConfigured()) {
    const pool = getPostgresPool();

    const [cardsResult, collectionResult, deliveryResult, contributionsResult, mediaResult, recentResult] = await Promise.all([
      pool.query<{ payment_status: PaymentStatus; count: string }>(
        "SELECT payment_status, COUNT(*)::text AS count FROM cards GROUP BY payment_status"
      ),
      pool.query<{ collection_status: CollectionStatus; count: string }>(
        "SELECT collection_status, COUNT(*)::text AS count FROM cards GROUP BY collection_status"
      ),
      pool.query<{ delivery_status: DeliveryStatus; count: string }>(
        "SELECT delivery_status, COUNT(*)::text AS count FROM cards GROUP BY delivery_status"
      ),
      pool.query<{
        status: ContributionStatus;
        count: string;
      }>("SELECT status, COUNT(*)::text AS count FROM contributions GROUP BY status"),
      pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM card_media_assets"),
      pool.query<{
        id: string;
        recipient_name: string;
        organizer_email: string;
        payment_status: PaymentStatus;
        collection_status: CollectionStatus;
        delivery_status: DeliveryStatus;
        created_at: Date | string;
      }>(`
        SELECT id, recipient_name, organizer_email, payment_status, collection_status, delivery_status, created_at
        FROM cards
        ORDER BY created_at DESC
        LIMIT 10
      `)
    ]);

    const cardsByPaymentStatus = emptyPaymentCounts();
    const cardsByCollectionStatus = emptyCollectionCounts();
    const cardsByDeliveryStatus = emptyDeliveryCounts();
    const contributionCounts: Record<ContributionStatus, number> = {
      visible: 0,
      hidden: 0,
      deleted: 0
    };

    for (const row of cardsResult.rows) {
      cardsByPaymentStatus[row.payment_status] = Number(row.count);
    }

    for (const row of contributionsResult.rows) {
      contributionCounts[row.status] = Number(row.count);
    }

    for (const row of collectionResult.rows) {
      cardsByCollectionStatus[row.collection_status] = Number(row.count);
    }

    for (const row of deliveryResult.rows) {
      cardsByDeliveryStatus[row.delivery_status] = Number(row.count);
    }

    return {
      totalCards: Object.values(cardsByPaymentStatus).reduce((sum, count) => sum + count, 0),
      cardsByPaymentStatus,
      cardsByCollectionStatus,
      cardsByDeliveryStatus,
      totalContributions: Object.values(contributionCounts).reduce((sum, count) => sum + count, 0),
      visibleContributions: contributionCounts.visible,
      hiddenContributions: contributionCounts.hidden,
      deletedContributions: contributionCounts.deleted,
      totalMediaAssets: Number(mediaResult.rows[0]?.count ?? 0),
      recentCards: recentResult.rows.map((row) => ({
        id: row.id,
        recipientName: row.recipient_name,
        organizerEmail: row.organizer_email,
        paymentStatus: row.payment_status,
        collectionStatus: row.collection_status,
        deliveryStatus: row.delivery_status,
        createdAt: toIso(row.created_at)
      }))
    };
  }

  const [cards, contributions, mediaAssets] = await Promise.all([
    listCardDrafts(),
    readJsonFile<Contribution>(contributionsFilePath),
    readJsonFile<CardMediaAsset>(mediaAssetsFilePath)
  ]);

  const cardsByPaymentStatus = emptyPaymentCounts();
  const cardsByCollectionStatus = emptyCollectionCounts();
  const cardsByDeliveryStatus = emptyDeliveryCounts();

  for (const card of cards) {
    cardsByPaymentStatus[card.paymentStatus] += 1;
    cardsByCollectionStatus[card.collectionStatus ?? "DRAFT"] += 1;
    cardsByDeliveryStatus[card.deliveryStatus ?? "PREPARING"] += 1;
  }

  const contributionCounts = contributions.reduce(
    (acc, contribution) => {
      acc[contribution.status] = (acc[contribution.status] ?? 0) + 1;
      return acc;
    },
    { visible: 0, hidden: 0, deleted: 0 } as Record<ContributionStatus, number>
  );

  const recentCards = cards
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 10)
    .map((card) => ({
      id: card.id,
      recipientName: card.recipientName,
      organizerEmail: card.organizerEmail,
      paymentStatus: card.paymentStatus,
      collectionStatus: card.collectionStatus ?? "DRAFT",
      deliveryStatus: card.deliveryStatus ?? "PREPARING",
      createdAt: card.createdAt
    }));

  return {
    totalCards: cards.length,
    cardsByPaymentStatus,
    cardsByCollectionStatus,
    cardsByDeliveryStatus,
    totalContributions: contributions.length,
    visibleContributions: contributionCounts.visible ?? 0,
    hiddenContributions: contributionCounts.hidden ?? 0,
    deletedContributions: contributionCounts.deleted ?? 0,
    totalMediaAssets: mediaAssets.length,
    recentCards
  };
};

export type ListAdminCardsOptions = {
  paymentStatus?: PaymentStatus | null;
  collectionStatus?: CollectionStatus | null;
  deliveryStatus?: DeliveryStatus | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

const buildSearchMatch = (search: string) => {
  const normalized = search.trim().toLowerCase();
  return (card: CardDraft) =>
    card.recipientName.toLowerCase().includes(normalized) ||
    card.organizerName.toLowerCase().includes(normalized) ||
    card.organizerEmail.toLowerCase().includes(normalized) ||
    card.occasionText.toLowerCase().includes(normalized);
};

export const listAdminCards = async (options: ListAdminCardsOptions = {}): Promise<CardDraft[]> => {
  const { paymentStatus, collectionStatus, deliveryStatus, search, limit = 50, offset = 0 } = options;

  if (isPostgresConfigured()) {
    const conditions: string[] = [];
    const params: (string | PaymentStatus | CollectionStatus | DeliveryStatus)[] = [];

    if (paymentStatus) {
      conditions.push(`payment_status = $${params.length + 1}`);
      params.push(paymentStatus);
    }

    if (collectionStatus) {
      conditions.push(`collection_status = $${params.length + 1}`);
      params.push(collectionStatus);
    }

    if (deliveryStatus) {
      conditions.push(`delivery_status = $${params.length + 1}`);
      params.push(deliveryStatus);
    }

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(recipient_name) LIKE $${params.length + 1}
        OR LOWER(organizer_name) LIKE $${params.length + 1}
        OR LOWER(organizer_email) LIKE $${params.length + 1}
        OR LOWER(occasion_text) LIKE $${params.length + 1}
      )`);
      params.push(term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT * FROM cards
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(String(limit), String(offset));

    const result = await getPostgresPool().query<CardDraft>(query, params);
    return result.rows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      eventDate: row.eventDate ? toIso(row.eventDate as unknown as Date | string).slice(0, 10) : null
    }));
  }

  let cards = await listCardDrafts();

  if (paymentStatus) cards = cards.filter((card) => card.paymentStatus === paymentStatus);
  if (collectionStatus) cards = cards.filter((card) => (card.collectionStatus ?? "DRAFT") === collectionStatus);
  if (deliveryStatus) cards = cards.filter((card) => (card.deliveryStatus ?? "PREPARING") === deliveryStatus);

  if (search?.trim()) {
    const matches = buildSearchMatch(search);
    cards = cards.filter(matches);
  }

  return cards
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(offset, offset + limit);
};

export type AdminCardDetail = {
  card: CardDraft;
  contributions: Contribution[];
  mediaAssets: CardMediaAsset[];
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getAdminCardById = async (cardId: string): Promise<AdminCardDetail | null> => {
  if (!UUID_REGEX.test(cardId)) {
    return null;
  }

  const [card, contributions, mediaAssets] = await Promise.all([
    getCardDraftById(cardId),
    listAllContributionsByCardId(cardId),
    listCardMediaAssetsByCardId(cardId)
  ]);

  if (!card) {
    return null;
  }

  return { card, contributions, mediaAssets };
};

export type AdminContributionListItem = Contribution & {
  cardId: string;
  recipientName: string;
  publicSlug: string;
  manageToken: string;
};

export type ListAdminContributionsOptions = {
  status?: ContributionStatus | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export const listAdminContributions = async (
  options: ListAdminContributionsOptions = {}
): Promise<AdminContributionListItem[]> => {
  const { status, search, limit = 50, offset = 0 } = options;

  if (isPostgresConfigured()) {
    const conditions: string[] = [];
    const params: (string | ContributionStatus)[] = [];

    if (status) {
      conditions.push(`c.status = $${params.length + 1}`);
      params.push(status);
    }

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(c.author_name) LIKE $${params.length + 1}
        OR LOWER(c.message) LIKE $${params.length + 1}
      )`);
      params.push(term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT
        c.id,
        c.card_id AS "cardId",
        c.author_name AS "authorName",
        c.author_role AS "authorRole",
        c.author_avatar_url AS "authorAvatarUrl",
        c.message,
        c.sort_order AS "sortOrder",
        c.status,
        c.source,
        c.created_at AS "createdAt",
        c.updated_at AS "updatedAt",
        cards.recipient_name AS "recipientName",
        cards.public_slug AS "publicSlug",
        cards.manage_token AS "manageToken"
      FROM contributions c
      JOIN cards ON cards.id = c.card_id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(String(limit), String(offset));

    const result = await getPostgresPool().query<AdminContributionListItem>(query, params);
    return result.rows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt)
    }));
  }

  const [cards, contributions] = await Promise.all([
    listCardDrafts(),
    readJsonFile<Contribution>(contributionsFilePath)
  ]);

  const cardById = new Map(cards.map((card) => [card.id, card]));

  let items = contributions
    .map((contribution) => {
      const card = cardById.get(contribution.cardId);
      return {
        ...contribution,
        cardId: contribution.cardId,
        recipientName: card?.recipientName ?? "—",
        publicSlug: card?.publicSlug ?? "",
        manageToken: card?.manageToken ?? ""
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (status) {
    items = items.filter((item) => item.status === status);
  }

  if (search?.trim()) {
    const normalized = search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.authorName.toLowerCase().includes(normalized) ||
        item.message.toLowerCase().includes(normalized)
    );
  }

  return items.slice(offset, offset + limit);
};

export const updateAdminContributionStatus = async (
  contributionId: string,
  status: ContributionStatus
): Promise<Contribution | null> => updateContributionStatus(contributionId, status);
