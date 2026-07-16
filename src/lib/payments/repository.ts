import { randomUUID } from "node:crypto";
import { getPostgresPool } from "@/lib/db/postgres";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";
import { createRobokassaRefund, getRobokassaConfig, getRobokassaOperationKey, getRobokassaRefundState } from "@/lib/payments/robokassa";
import { getActiveRobokassaMerchantAccount, getMerchantAccountById } from "@/lib/payments/merchant-accounts";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const priceInKopecks = () => Number(process.env.CARD_FINAL_PRICE_KOPECKS ?? 39900);

type Checkout = { confirmationUrl: string; invoiceId: string; orderId: string; reused: boolean };

const nextInvoiceId = () => `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

export const createRobokassaCheckout = async (input: {
  manageToken: string;
  receiptEmail: string;
  offerAccepted: boolean;
  privacyAccepted: boolean;
  buildUrl: (invoiceId: string, orderId: string, merchantAccountId: string, receipt: string) => string | Promise<string>;
}): Promise<Checkout> => {
  if (!input.offerAccepted || !input.privacyAccepted) {
    throw new CardLifecycleConflictError("Подтвердите принятие оферты, правил возврата и политики обработки персональных данных.");
  }
  const merchantAccount = await getActiveRobokassaMerchantAccount(process.env.ROBOKASSA_MODE === "live" ? "live" : "test");
  if (!merchantAccount) throw new CardLifecycleConflictError("Платёжный аккаунт пока не настроен.");
  const amount = priceInKopecks();
  if (!Number.isInteger(amount) || amount < 1) throw new Error("CARD_FINAL_PRICE_KOPECKS is invalid.");
  const receipt = JSON.stringify({ items: [{ name: "Доступ к финальной подготовке и передаче онлайн-открытки Slovesto", quantity: 1, cost: amount / 100, tax: "none", payment_object: "service", payment_method: process.env.ROBOKASSA_RECEIPT_PAYMENT_METHOD || undefined }] });
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const cardResult = await client.query<{
      id: string; payment_status: string; deleted_at: Date | null; purged_at: Date | null; is_hidden: boolean;
      repurchase_allowed_at: Date | null; repurchase_expires_at: Date | null; repurchase_used_at: Date | null;
    }>(`SELECT id, payment_status, deleted_at, purged_at, is_hidden, repurchase_allowed_at, repurchase_expires_at, repurchase_used_at
        FROM cards WHERE manage_token = $1 FOR UPDATE`, [input.manageToken]);
    const card = cardResult.rows[0];
    if (!card || card.deleted_at || card.purged_at) throw new CardLifecycleConflictError("Открытка недоступна для оплаты.");

    const canRepurchase = (card.payment_status === "REFUNDED" || card.payment_status === "REVOKED")
      && card.repurchase_allowed_at !== null
      && card.repurchase_expires_at !== null
      && card.repurchase_expires_at > new Date()
      && card.repurchase_used_at === null;
    if (card.payment_status !== "UNPAID" && !canRepurchase) {
      throw new CardLifecycleConflictError("Для этой открытки оплата сейчас недоступна.");
    }

    const existing = await client.query<Checkout>(`SELECT pa.confirmation_url AS "confirmationUrl", pa.provider_payment_id AS "invoiceId", po.id AS "orderId", true AS reused
       FROM payment_attempts pa JOIN payment_orders po ON po.id = pa.order_id
       WHERE po.card_id = $1 AND pa.provider = 'robokassa' AND pa.status = 'PENDING'
       ORDER BY pa.created_at DESC LIMIT 1`, [card.id]);
    if (existing.rows[0]?.confirmationUrl && existing.rows[0].invoiceId) {
      await client.query("COMMIT");
      return existing.rows[0];
    }

    const orderId = randomUUID();
    const attemptId = randomUUID();
    const invoiceId = nextInvoiceId();
    const confirmationUrl = await input.buildUrl(invoiceId, orderId, merchantAccount.id, receipt);
    await client.query(`INSERT INTO payment_orders (
      id, card_id, amount, currency, status, provider, provider_order_id, paid_at, created_at, updated_at,
      product_code, list_amount, discount_amount, payable_amount, price_version, merchant_account_id, seller_snapshot, provider_invoice_id, receipt_email, receipt,
      offer_version, refund_rules_version, privacy_version, offer_accepted_at, privacy_accepted_at
    ) VALUES ($1, $2, $3, 'RUB', 'CREATED', 'robokassa', $4, NULL, now(), now(), 'final-card-v1', $3, 0, $3, 'final-card-v1', $5, $6::jsonb, $4::bigint, $7, $8::jsonb, $9, $10, $11, now(), now())`,
      [orderId, card.id, amount, invoiceId, merchantAccount.id, JSON.stringify({ fullName: merchantAccount.sellerFullName, inn: merchantAccount.sellerInn, taxStatus: merchantAccount.sellerTaxStatus }), input.receiptEmail, receipt, LEGAL_VERSIONS.offer, LEGAL_VERSIONS.refunds, LEGAL_VERSIONS.privacy]);
    await client.query(`INSERT INTO payment_attempts (
      id, order_id, provider, provider_payment_id, status, amount, currency, confirmation_url, idempotency_key, provider_payload
    ) VALUES ($1, $2, 'robokassa', $3, 'PENDING', $4, 'RUB', $5, $6, $7::jsonb)`,
      [attemptId, orderId, invoiceId, amount, confirmationUrl, randomUUID(), JSON.stringify({ invoiceId, Shp_order: orderId, Shp_account: merchantAccount.id })]);
    if (canRepurchase) await client.query("UPDATE cards SET repurchase_used_at = now(), updated_at = now() WHERE id = $1", [card.id]);
    await client.query("COMMIT");
    return { confirmationUrl, invoiceId, orderId, reused: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const confirmRobokassaPayment = async (input: { invoiceId: string; merchantAccountId: string; outSum: string; payload: Record<string, string> }) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ attempt_id: string; order_id: string; card_id: string; payable_amount: number; status: string; provider_payload: { Shp_order?: string; Shp_account?: string } | null }>(
      `SELECT pa.id AS attempt_id, po.id AS order_id, po.card_id, po.payable_amount, po.status, pa.provider_payload
       FROM payment_attempts pa JOIN payment_orders po ON po.id = pa.order_id
       WHERE pa.provider = 'robokassa' AND po.merchant_account_id = $1 AND po.provider_invoice_id = $2 FOR UPDATE`, [input.merchantAccountId, input.invoiceId]);
    const payment = found.rows[0];
    if (!payment) throw new CardLifecycleConflictError("Счёт Robokassa не найден.");
    if (payment.provider_payload?.Shp_order !== payment.order_id || payment.provider_payload?.Shp_account !== input.merchantAccountId || input.payload.Shp_order !== payment.order_id || input.payload.Shp_account !== input.merchantAccountId) {
      throw new CardLifecycleConflictError("Параметры уведомления Robokassa не совпадают со счётом.");
    }
    if (Number(input.outSum) !== payment.payable_amount / 100) throw new CardLifecycleConflictError("Сумма уведомления Robokassa не совпадает со счётом.");

    if (payment.status === "PAID") {
      await client.query("COMMIT");
      return { orderId: payment.order_id, alreadyPaid: true };
    }
    if (payment.status !== "CREATED") throw new CardLifecycleConflictError("Счёт уже не может быть оплачен.");

    await client.query("UPDATE payment_attempts SET status = 'SUCCEEDED', provider_payload = provider_payload || $2::jsonb, updated_at = now() WHERE id = $1", [payment.attempt_id, JSON.stringify({ result: input.payload })]);
    await client.query("UPDATE payment_orders SET status = 'PAID', paid_at = now(), updated_at = now() WHERE id = $1", [payment.order_id]);
    await client.query("UPDATE cards SET payment_status = 'PAID', paid_at = now(), refunded_at = NULL, revoked_at = NULL, active_paid_order_id = $2, is_hidden = false, hidden_at = NULL, updated_at = now() WHERE id = $1", [payment.card_id, payment.order_id]);
    await client.query("INSERT INTO payment_events (id, order_id, attempt_id, provider, provider_event_id, event_type, payload, processed_at) VALUES ($1, $2, $3, 'robokassa', $4, 'payment_succeeded', $5::jsonb, now())", [randomUUID(), payment.order_id, payment.attempt_id, `result:${input.invoiceId}`, JSON.stringify(input.payload)]);
    await client.query("INSERT INTO card_audit_events (id, card_id, actor_type, event_type, metadata) VALUES ($1, $2, 'provider', 'payment_paid', $3::jsonb)", [randomUUID(), payment.card_id, JSON.stringify({ provider: "robokassa", orderId: payment.order_id })]);
    await client.query("INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload) VALUES ($1, 'payment.paid', 'card', $2, $3::jsonb)", [randomUUID(), payment.card_id, JSON.stringify({ orderId: payment.order_id })]);
    await client.query("COMMIT");
    return { orderId: payment.order_id, alreadyPaid: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const requestRobokassaFullRefund = async (orderId: string, reason: string) => {
  const pool = getPostgresPool();
  const found = await pool.query<{ id: string; payable_amount: number; provider_order_id: string | null; status: string; total_refunded_amount: number }>(
    "SELECT id, payable_amount, provider_order_id, status, total_refunded_amount FROM payment_orders WHERE id = $1 LIMIT 1", [orderId]);
  const order = found.rows[0];
  if (!order || order.status !== "PAID" || order.total_refunded_amount > 0 || !order.provider_order_id) {
    throw new CardLifecycleConflictError("Для этого заказа полный возврат сейчас недоступен.");
  }
  const account = await getMerchantAccountById((await pool.query<{ merchant_account_id: string }>("SELECT merchant_account_id FROM payment_orders WHERE id = $1", [orderId])).rows[0]?.merchant_account_id ?? "");
  if (!account) throw new CardLifecycleConflictError("Платёжный аккаунт заказа не найден.");
  const config = getRobokassaConfig(account);
  const opKey = await getRobokassaOperationKey({ config, invoiceId: order.provider_order_id });
  const requestId = await createRobokassaRefund({ opKey });
  await pool.query(`INSERT INTO payment_refunds (id, order_id, provider_refund_id, amount, status, reason, provider_payload)
    VALUES ($1, $2, $3, $4, 'PROCESSING', $5, $6::jsonb)`, [randomUUID(), orderId, requestId, order.payable_amount, reason, JSON.stringify({ opKey, requestId })]);
  return requestId;
};

export const syncRobokassaRefund = async (requestId: string) => {
  const state = await getRobokassaRefundState(requestId);
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ refund_id: string; order_id: string; amount: number; card_id: string; payable_amount: number; total_refunded_amount: number }>(
      `SELECT pr.id AS refund_id, pr.order_id, pr.amount, po.card_id, po.payable_amount, po.total_refunded_amount
       FROM payment_refunds pr JOIN payment_orders po ON po.id = pr.order_id WHERE pr.provider_refund_id = $1 FOR UPDATE`, [requestId]);
    const refund = found.rows[0];
    if (!refund) throw new CardLifecycleConflictError("Возврат не найден.");
    if (state.label === "processing") {
      await client.query("UPDATE payment_refunds SET provider_payload = provider_payload || $2::jsonb WHERE id = $1", [refund.refund_id, JSON.stringify(state)]);
      await client.query("COMMIT");
      return state.label;
    }
    if (state.label === "canceled") {
      await client.query("UPDATE payment_refunds SET status = 'CANCELED', provider_payload = provider_payload || $2::jsonb WHERE id = $1", [refund.refund_id, JSON.stringify(state)]);
      await client.query("COMMIT");
      return state.label;
    }
    const total = refund.total_refunded_amount + refund.amount;
    const fullyRefunded = total >= refund.payable_amount;
    await client.query("UPDATE payment_refunds SET status = 'SUCCEEDED', completed_at = now(), provider_payload = provider_payload || $2::jsonb WHERE id = $1", [refund.refund_id, JSON.stringify(state)]);
    await client.query("UPDATE payment_orders SET total_refunded_amount = $2, status = $3, refunded_at = CASE WHEN $3 = 'REFUNDED' THEN now() ELSE refunded_at END, updated_at = now() WHERE id = $1", [refund.order_id, total, fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED"]);
    if (fullyRefunded) await client.query("UPDATE cards SET payment_status = 'REFUNDED', refunded_at = now(), active_paid_order_id = NULL, is_hidden = true, hidden_at = now(), updated_at = now() WHERE id = $1 AND active_paid_order_id = $2", [refund.card_id, refund.order_id]);
    await client.query("INSERT INTO card_audit_events (id, card_id, actor_type, event_type, metadata) VALUES ($1, $2, 'provider', 'payment_refunded', $3::jsonb)", [randomUUID(), refund.card_id, JSON.stringify({ orderId: refund.order_id, amount: refund.amount })]);
    await client.query("INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload) VALUES ($1, 'payment.refunded', 'card', $2, $3::jsonb)", [randomUUID(), refund.card_id, JSON.stringify({ orderId: refund.order_id, amount: refund.amount })]);
    await client.query("COMMIT");
    return state.label;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
