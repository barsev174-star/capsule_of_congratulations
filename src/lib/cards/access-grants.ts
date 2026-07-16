import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPostgresPool } from "@/lib/db/postgres";
import { CardLifecycleConflictError } from "./lifecycle";
import { getAdminAuthEnv } from "@/lib/admin/auth";

export const accessGrantReasons = ["QA_TEST", "COMPLIMENTARY", "SUPPORT_COMPENSATION", "PARTNER", "PROMOTION", "OTHER"] as const;
export type AccessGrantReason = (typeof accessGrantReasons)[number];
export type CardAccessGrant = { id: string; cardId: string; status: "ACTIVE" | "REVOKED" | "EXPIRED" | "SUPERSEDED"; reasonCode: AccessGrantReason; comment: string; expiresAt: string | null };

const isActive = (grant: Pick<CardAccessGrant, "status" | "expiresAt"> | null) =>
  Boolean(grant && grant.status === "ACTIVE" && (!grant.expiresAt || new Date(grant.expiresAt) > new Date()));

const resolveAdminId = async (client: PoolClient, email: string) => {
  const normalizedEmail = email.toLowerCase();
  const found = await client.query<{ id: string }>("SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (found.rows[0]) return found.rows[0].id;
  const env = getAdminAuthEnv();
  if (normalizedEmail !== env.email.toLowerCase()) throw new CardLifecycleConflictError("Администратор не найден.");
  const id = randomUUID();
  await client.query(`INSERT INTO admin_users (id, email, password_hash, password_salt, role, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'admin', now(), now()) ON CONFLICT (email) DO NOTHING`, [id, normalizedEmail, env.passwordHash, env.passwordSalt]);
  const created = await client.query<{ id: string }>("SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (!created.rows[0]) throw new CardLifecycleConflictError("Администратор не найден.");
  return created.rows[0].id;
};

export const hasFinalAccess = (input: { paymentStatus: string; activePaidOrderId: string | null; activeGrant: CardAccessGrant | null }) =>
  (input.paymentStatus === "PAID" && input.activePaidOrderId !== null) || isActive(input.activeGrant);

export const getActiveCardAccessGrant = async (cardId: string): Promise<CardAccessGrant | null> => {
  const result = await getPostgresPool().query<CardAccessGrant & { card_id: string; reason_code: AccessGrantReason; expires_at: Date | string | null }>(
    `SELECT id, card_id, status, reason_code, comment, expires_at
     FROM card_access_grants WHERE card_id = $1 AND status = 'ACTIVE' AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`, [cardId]
  );
  const row = result.rows[0];
  return row ? { id: row.id, cardId: row.card_id, status: row.status, reasonCode: row.reason_code, comment: row.comment, expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null } : null;
};

export const grantCardAccess = async (input: { cardId: string; adminEmail: string; reasonCode: AccessGrantReason; comment: string; expiresAt: string | null }) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const card = await client.query<{ id: string; payment_status: string; active_paid_order_id: string | null; active_access_grant_id: string | null; deleted_at: Date | null; purged_at: Date | null }>(
      "SELECT id, payment_status, active_paid_order_id, active_access_grant_id, deleted_at, purged_at FROM cards WHERE id = $1 FOR UPDATE", [input.cardId]
    );
    const current = card.rows[0];
    if (!current || current.deleted_at || current.purged_at) throw new CardLifecycleConflictError("Открытка недоступна для выдачи доступа.");
    if (current.payment_status === "PAID" || current.active_paid_order_id) throw new CardLifecycleConflictError("У открытки уже есть подтверждённый платный доступ.");
    if (current.active_access_grant_id) throw new CardLifecycleConflictError("Для открытки уже выдан административный доступ.");
    const adminId = await resolveAdminId(client, input.adminEmail);
    const id = randomUUID();
    await client.query(`INSERT INTO card_access_grants (id, card_id, status, reason_code, comment, granted_by_admin_id, expires_at)
      VALUES ($1, $2, 'ACTIVE', $3, $4, $5, $6)`, [id, input.cardId, input.reasonCode, input.comment, adminId, input.expiresAt]);
    await client.query("UPDATE cards SET active_access_grant_id = $2, updated_at = now() WHERE id = $1", [input.cardId, id]);
    await client.query("INSERT INTO card_audit_events (id, card_id, actor_type, actor_id, event_type, metadata) VALUES ($1, $2, 'admin', $3, 'CARD_ACCESS_GRANTED', $4::jsonb)", [randomUUID(), input.cardId, adminId, JSON.stringify({ grantId: id, reasonCode: input.reasonCode, expiresAt: input.expiresAt })]);
    await client.query("COMMIT");
    return id;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const revokeCardAccess = async (input: { cardId: string; grantId: string; adminEmail: string; comment: string }) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const adminId = await resolveAdminId(client, input.adminEmail);
    const updated = await client.query("UPDATE card_access_grants SET status = 'REVOKED', revoked_at = now(), revoked_by_admin_id = $3, revoke_comment = $4, updated_at = now() WHERE id = $1 AND card_id = $2 AND status = 'ACTIVE' RETURNING id", [input.grantId, input.cardId, adminId, input.comment]);
    if (!updated.rows[0]) throw new CardLifecycleConflictError("Активный доступ не найден.");
    await client.query("UPDATE cards SET active_access_grant_id = NULL, updated_at = now() WHERE id = $1 AND active_access_grant_id = $2", [input.cardId, input.grantId]);
    await client.query("INSERT INTO card_audit_events (id, card_id, actor_type, actor_id, event_type, metadata) VALUES ($1, $2, 'admin', $3, 'CARD_ACCESS_REVOKED', $4::jsonb)", [randomUUID(), input.cardId, adminId, JSON.stringify({ grantId: input.grantId })]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};
