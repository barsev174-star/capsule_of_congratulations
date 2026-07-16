import { randomUUID } from "node:crypto";
import { getPostgresPool } from "@/lib/db/postgres";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";

const revocationReasons = ["CHARGEBACK", "PROVIDER_REVERSAL", "FRAUD", "ERRONEOUS_ENTITLEMENT", "OTHER"] as const;
export type RevocationReason = (typeof revocationReasons)[number];

export const isRevocationReason = (value: string): value is RevocationReason =>
  revocationReasons.includes(value as RevocationReason);

const resolveAdminId = async (client: { query: Function }, email: string) => {
  const result = await client.query("SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [email.toLowerCase()]);
  const id = result.rows[0]?.id as string | undefined;
  if (!id) throw new CardLifecycleConflictError("Учётная запись администратора не найдена.");
  return id;
};

export const revokePaymentOrder = async (input: { orderId: string; adminEmail: string; reason: RevocationReason; comment: string }) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const adminId = await resolveAdminId(client, input.adminEmail);
    const result = await client.query<{ order_id: string; card_id: string; status: string; active_paid_order_id: string | null }>(
      `SELECT po.id AS order_id, po.card_id, po.status, c.active_paid_order_id
       FROM payment_orders po JOIN cards c ON c.id = po.card_id WHERE po.id = $1 FOR UPDATE`, [input.orderId]);
    const order = result.rows[0];
    if (!order) throw new CardLifecycleConflictError("Заказ не найден.");
    if (order.status === "REVOKED") {
      await client.query("COMMIT");
      return;
    }
    if (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED") {
      throw new CardLifecycleConflictError("Отозвать можно только оплаченный заказ.");
    }
    await client.query(`UPDATE payment_orders SET status = 'REVOKED', revoked_at = now(), revoked_reason_code = $2,
       revoked_comment = $3, revoked_by_admin_id = $4, updated_at = now() WHERE id = $1`, [input.orderId, input.reason, input.comment, adminId]);
    if (order.active_paid_order_id === input.orderId) {
      await client.query(`UPDATE cards SET payment_status = 'REVOKED', active_paid_order_id = NULL, revoked_at = now(),
         is_hidden = true, hidden_at = now(), updated_at = now() WHERE id = $1`, [order.card_id]);
    }
    await client.query(`INSERT INTO payment_revocations (id, order_id, card_id, reason_code, comment, created_by_admin_id)
       VALUES ($1, $2, $3, $4, $5, $6)`, [randomUUID(), input.orderId, order.card_id, input.reason, input.comment, adminId]);
    await client.query(`INSERT INTO card_audit_events (id, card_id, actor_type, actor_id, event_type, metadata)
       VALUES ($1, $2, 'admin', $3, 'payment_revoked', $4::jsonb)`, [randomUUID(), order.card_id, adminId, JSON.stringify({ orderId: input.orderId, reason: input.reason })]);
    await client.query(`INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, 'payment.revoked', 'card', $2, $3::jsonb)`, [randomUUID(), order.card_id, JSON.stringify({ orderId: input.orderId, reason: input.reason })]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const grantRepurchase = async (input: { cardId: string; adminEmail: string }) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const adminId = await resolveAdminId(client, input.adminEmail);
    const result = await client.query<{ payment_status: string; repurchase_expires_at: Date | null; repurchase_used_at: Date | null }>(
      "SELECT payment_status, repurchase_expires_at, repurchase_used_at FROM cards WHERE id = $1 FOR UPDATE", [input.cardId]);
    const card = result.rows[0];
    if (!card || (card.payment_status !== "REFUNDED" && card.payment_status !== "REVOKED")) {
      throw new CardLifecycleConflictError("Повторная покупка доступна только после возврата или отзыва.");
    }
    if (card.repurchase_expires_at && card.repurchase_expires_at > new Date() && !card.repurchase_used_at) {
      throw new CardLifecycleConflictError("Разрешение на повторную покупку уже активно.");
    }
    await client.query(`UPDATE cards SET repurchase_allowed_at = now(), repurchase_expires_at = now() + interval '30 days',
       repurchase_used_at = NULL, repurchase_allowed_by_admin_id = $2, updated_at = now() WHERE id = $1`, [input.cardId, adminId]);
    await client.query(`INSERT INTO card_audit_events (id, card_id, actor_type, actor_id, event_type, metadata)
       VALUES ($1, $2, 'admin', $3, 'repurchase_granted', '{"expiresInDays":30}'::jsonb)`, [randomUUID(), input.cardId, adminId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
