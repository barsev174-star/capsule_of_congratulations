import { getPostgresPool } from "@/lib/db/postgres";
import {
  assertCanCloseCollection,
  assertCanDeliverCard,
  assertCanOpenCollection,
  CardLifecycleConflictError,
  type CardLifecycle,
  isGiftAccessible
} from "@/lib/cards/lifecycle";
import { getActiveCardAccessGrant } from "@/lib/cards/access-grants";

export type CardLifecycleRecord = CardLifecycle & {
  id: string;
  manageToken: string | null;
  finalSlug: string | null;
  recipientName: string | null;
  occasionText: string | null;
  fromLabel: string | null;
  templateId: string | null;
  collectionOpenedAt: string | null;
  collectionClosedAt: string | null;
  deliveredAt: string | null;
  recipientFirstOpenedAt: string | null;
};

type CardLifecycleRow = {
  id: string;
  manage_token: string | null;
  final_slug: string | null;
  recipient_name: string | null;
  occasion_text: string | null;
  from_label: string | null;
  template_id: string | null;
  payment_status: CardLifecycle["paymentStatus"];
  collection_status: CardLifecycle["collectionStatus"];
  delivery_status: CardLifecycle["deliveryStatus"];
  active_paid_order_id: string | null;
  active_access_grant_id: string | null;
  is_hidden: boolean;
  deleted_at: Date | string | null;
  purged_at: Date | string | null;
  collection_opened_at: Date | string | null;
  collection_closed_at: Date | string | null;
  delivered_at: Date | string | null;
  recipient_first_opened_at: Date | string | null;
};

const iso = (value: Date | string | null) => (value ? (value instanceof Date ? value.toISOString() : value) : null);

const mapCard = (row: CardLifecycleRow): CardLifecycleRecord => ({
  id: row.id,
  manageToken: row.manage_token,
  finalSlug: row.final_slug,
  recipientName: row.recipient_name,
  occasionText: row.occasion_text,
  fromLabel: row.from_label,
  templateId: row.template_id,
  paymentStatus: row.payment_status,
  collectionStatus: row.collection_status,
  deliveryStatus: row.delivery_status,
  activePaidOrderId: row.active_paid_order_id,
  isHidden: row.is_hidden,
  deletedAt: iso(row.deleted_at),
  purgedAt: iso(row.purged_at),
  collectionOpenedAt: iso(row.collection_opened_at),
  collectionClosedAt: iso(row.collection_closed_at),
  deliveredAt: iso(row.delivered_at),
  recipientFirstOpenedAt: iso(row.recipient_first_opened_at)
});

const lifecycleColumns = `id, manage_token, final_slug, recipient_name, occasion_text, from_label, template_id,
  payment_status, collection_status, delivery_status, active_paid_order_id, active_access_grant_id, is_hidden,
  deleted_at, purged_at, collection_opened_at, collection_closed_at, delivered_at,
  recipient_first_opened_at`;

const selectLifecycle = `SELECT ${lifecycleColumns} FROM cards`;

const withAccess = async (card: CardLifecycleRecord) => ({ ...card, hasAdminAccess: Boolean(await getActiveCardAccessGrant(card.id)) });

const assertCollectionReady = (card: CardLifecycleRecord) => {
  if (!card.recipientName?.trim() || !card.occasionText?.trim() || !card.fromLabel?.trim() || !card.templateId) {
    throw new CardLifecycleConflictError("Сначала заполните обязательные поля.");
  }
};

const assertOperational = (card: CardLifecycleRecord) => {
  if (card.deletedAt !== null || card.purgedAt !== null || card.isHidden) {
    throw new CardLifecycleConflictError("Открытка недоступна для этого действия.");
  }
};

export const getCardLifecycleByManageToken = async (manageToken: string): Promise<CardLifecycleRecord | null> => {
  const result = await getPostgresPool().query<CardLifecycleRow>(`${selectLifecycle} WHERE manage_token = $1 LIMIT 1`, [manageToken]);
  return result.rows[0] ? withAccess(mapCard(result.rows[0])) : null;
};

export const getCardLifecycleByPublicSlug = async (publicSlug: string): Promise<CardLifecycleRecord | null> => {
  const result = await getPostgresPool().query<CardLifecycleRow>(`${selectLifecycle} WHERE public_slug = $1 LIMIT 1`, [publicSlug]);
  return result.rows[0] ? withAccess(mapCard(result.rows[0])) : null;
};

export const openCollection = async (manageToken: string): Promise<CardLifecycleRecord> => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<CardLifecycleRow>(`${selectLifecycle} WHERE manage_token = $1 FOR UPDATE`, [manageToken]);
    const card = current.rows[0] ? await withAccess(mapCard(current.rows[0])) : null;
    if (!card) throw new CardLifecycleConflictError("Открытка не найдена.");
    assertOperational(card);
    assertCanOpenCollection(card);
    assertCollectionReady(card);

    const updated = await client.query<CardLifecycleRow>(
      `UPDATE cards
       SET collection_status = 'OPEN', collection_opened_at = COALESCE(collection_opened_at, now()), collection_closed_at = NULL, updated_at = now()
       WHERE id = $1
       RETURNING ${lifecycleColumns}`,
      [card.id]
    );
    await client.query("COMMIT");
    return mapCard(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const closeCollection = async (manageToken: string): Promise<CardLifecycleRecord> => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<CardLifecycleRow>(`${selectLifecycle} WHERE manage_token = $1 FOR UPDATE`, [manageToken]);
    const card = current.rows[0] ? await withAccess(mapCard(current.rows[0])) : null;
    if (!card) throw new CardLifecycleConflictError("Открытка не найдена.");
    assertOperational(card);
    assertCanCloseCollection(card);

    const updated = await client.query<CardLifecycleRow>(
      `UPDATE cards
       SET collection_status = 'CLOSED', collection_closed_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING ${lifecycleColumns}`,
      [card.id]
    );
    await client.query("COMMIT");
    return mapCard(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deliverCard = async (manageToken: string): Promise<CardLifecycleRecord> => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<CardLifecycleRow>(`${selectLifecycle} WHERE manage_token = $1 FOR UPDATE`, [manageToken]);
    const card = current.rows[0] ? await withAccess(mapCard(current.rows[0])) : null;
    if (!card) throw new CardLifecycleConflictError("Открытка не найдена.");
    assertOperational(card);

    if (card.deliveryStatus === "DELIVERED") {
      await client.query("COMMIT");
      return card;
    }

    assertCanDeliverCard(card);
    assertCollectionReady(card);
    const updated = await client.query<CardLifecycleRow>(
      `UPDATE cards
       SET delivery_status = 'DELIVERED', delivered_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING ${lifecycleColumns}`,
      [card.id]
    );
    await client.query("COMMIT");
    return mapCard(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const markRecipientFirstOpened = async (finalSlug: string): Promise<CardLifecycleRecord | null> => {
  const result = await getPostgresPool().query<CardLifecycleRow>(
    `UPDATE cards
     SET recipient_first_opened_at = COALESCE(recipient_first_opened_at, now())
     WHERE final_slug = $1
       AND delivery_status = 'DELIVERED'
       AND is_hidden = false
       AND deleted_at IS NULL
       AND purged_at IS NULL
       AND ((payment_status = 'PAID'
       AND active_paid_order_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM payment_orders active_order
         WHERE active_order.id = cards.active_paid_order_id
           AND active_order.card_id = cards.id
           AND active_order.status = 'PAID'
           AND active_order.total_refunded_amount < active_order.payable_amount
           AND active_order.revoked_at IS NULL
       )) OR EXISTS (
         SELECT 1 FROM card_access_grants access_grant
         WHERE access_grant.id = cards.active_access_grant_id AND access_grant.status = 'ACTIVE'
           AND (access_grant.expires_at IS NULL OR access_grant.expires_at > now())
       ))
     RETURNING ${lifecycleColumns}`,
    [finalSlug]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const getGiftLifecycleByFinalSlug = async (finalSlug: string): Promise<CardLifecycleRecord | null> => {
  const result = await getPostgresPool().query<CardLifecycleRow>(
    `${selectLifecycle} WHERE final_slug = $1 LIMIT 1`,
    [finalSlug]
  );
  const card = result.rows[0] ? await withAccess(mapCard(result.rows[0])) : null;
  return card && isGiftAccessible(card) ? card : null;
};
