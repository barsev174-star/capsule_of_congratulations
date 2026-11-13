import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import { recordAdminAction } from "./audit";
import { requestRobokassaFullRefund, syncRobokassaRefund } from "@/lib/payments/repository";

export type AdminPaymentAttempt = { id: string; orderId: string; amount: number; currency: string; provider: string; providerPaymentId: string | null; status: string; createdAt: string; updatedAt: string };
const attemptFields = `id,order_id AS "orderId",amount,currency,provider,provider_payment_id AS "providerPaymentId",status,created_at::text AS "createdAt",updated_at::text AS "updatedAt"`;
export async function listAdminPaymentAttempts(input: { status?: string; search?: string; days?: number | null; orderId?: string; limit?: number; offset?: number } = {}): Promise<AdminPaymentAttempt[]> {
  if (!isPostgresConfigured()) return [];
  const conditions: string[] = [], values: (string | number)[] = [];
  const add = (sql: string, value: string | number) => { values.push(value); conditions.push(sql.replaceAll("?", `$${values.length}`)); };
  if (input.status) add("status = ?", input.status);
  if (input.search) add("(id::text ILIKE ? OR order_id::text ILIKE ? OR provider_payment_id ILIKE ?)", `%${input.search}%`);
  if (input.days) add("created_at >= now() - (? * interval '1 day')", input.days);
  if (input.orderId) add("order_id = ?::uuid", input.orderId);
  values.push(input.limit ?? 21, input.offset ?? 0);
  const result = await getPostgresPool().query<AdminPaymentAttempt>(`SELECT ${attemptFields} FROM payment_attempts ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC,id LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return result.rows;
}
export async function getAdminPaymentAttempt(id: string): Promise<AdminPaymentAttempt | null> {
  if (!isPostgresConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await getPostgresPool().query<AdminPaymentAttempt>(`SELECT ${attemptFields} FROM payment_attempts WHERE id = $1`, [id])).rows[0] ?? null;
}
export type AdminRefund = { id: string; providerRefundId: string | null; amount: number; status: string; createdAt: string; completedAt: string | null };
export async function getAdminOrderFinance(orderId: string): Promise<{ attempts: AdminPaymentAttempt[]; refunds: AdminRefund[]; refundRequested: boolean }> {
  if (!isPostgresConfigured()) return { attempts: [], refunds: [], refundRequested: false };
  const [attempts, refunds, guard] = await Promise.all([
    listAdminPaymentAttempts({ orderId, limit: 100 }),
    getPostgresPool().query<AdminRefund>(`SELECT id,provider_refund_id AS "providerRefundId",amount,status,created_at::text AS "createdAt",completed_at::text AS "completedAt" FROM payment_refunds WHERE order_id=$1 ORDER BY created_at DESC LIMIT 100`, [orderId]),
    getPostgresPool().query("SELECT id FROM admin_action_events WHERE object_id=$1 AND action='refund.request_started' LIMIT 1", [orderId])
  ]);
  return { attempts, refunds: refunds.rows, refundRequested: Boolean(guard.rows.length || refunds.rows.length) };
}

// The durable reservation precedes the external call. Unknown provider outcomes
// remain blocked for operator investigation instead of risking another refund.
export async function requestAdminRefundOnce(orderId: string, reason: string, email: string, request = requestRobokassaFullRefund) {
  const client = await getPostgresPool().connect();
  let reserved = false;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`admin.refund:${orderId}`]);
    const existing = await client.query("SELECT id FROM payment_refunds WHERE order_id=$1::uuid UNION ALL SELECT id FROM admin_action_events WHERE object_id=$1::text AND action='refund.request_started' LIMIT 1", [orderId]);
    const eligible = await client.query("SELECT id FROM payment_orders WHERE id=$1 AND status='PAID' AND total_refunded_amount=0 AND provider_order_id IS NOT NULL", [orderId]);
    if (!existing.rows.length && eligible.rows.length) {
      await recordAdminAction({ email, action: "refund.request_started", objectType: "order", objectId: orderId }, client);
      reserved = true;
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  if (!reserved) return;
  try { await request(orderId, reason); await recordAdminAction({ email, action: "refund.request_completed", objectType: "order", objectId: orderId }); }
  catch (error) { await recordAdminAction({ email, action: "refund.request_unknown", objectType: "order", objectId: orderId, result: "failed" }); throw error; }
}

export async function syncAdminRefundOnce(requestId: string, email: string) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtextextended($1,0))", [`admin.refund.sync:${requestId}`]);
    const result = await client.query<{ status: string; id: string }>("SELECT id,status FROM payment_refunds WHERE provider_refund_id=$1", [requestId]);
    if (!result.rows[0] || result.rows[0].status === "SUCCEEDED") return;
    await syncRobokassaRefund(requestId);
    await recordAdminAction({ email, action: "refund.sync", objectType: "refund", objectId: result.rows[0].id });
  } finally { await client.query("SELECT pg_advisory_unlock(hashtextextended($1,0))", [`admin.refund.sync:${requestId}`]); client.release(); }
}
