import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { AdminUserRole } from "./types";
import { formatMoney, type AdminPeriod } from "./format";

// A paid status or an administrative access grant alone is not revenue.
export const livePaymentProof = `EXISTS (
  SELECT 1 FROM payment_events e JOIN payment_attempts a ON a.id = e.attempt_id AND a.order_id = o.id
  WHERE e.order_id = o.id AND e.provider = 'robokassa' AND e.event_type = 'payment_succeeded'
    AND e.processed_at <= now() AND a.provider = 'robokassa' AND a.status = 'SUCCEEDED'
    AND a.confirmation_url LIKE 'https://auth.robokassa.ru/Merchant/Index.aspx?%'
    AND a.confirmation_url !~* '[?&]IsTest=1(&|$)'
    AND COALESCE(a.provider_payload->'result'->>'IsTest', '0') <> '1'
    AND COALESCE(e.payload->>'IsTest', '0') <> '1'
)`;
export type OverviewMetrics = { created: number; paid: number | null; revenue: number | null; active: number; reminders: number | null };
export type Overview = {
  current: OverviewMetrics; previous: OverviewMetrics | null;
  total: { cards: number; greetings: number; photos: number; delivered: number };
  attention: { support: number; reminders: number; refunds: number; technical: number };
  remindersPending: number;
  activity: { id: string; label: string; href: string | null; date: string; context?: { occasion?: string; eventDate?: string; amount?: number; currency?: string; category?: string } }[];
};
export const overviewSql = `
WITH bounds AS (SELECT $1::timestamptz AS since, $2::timestamptz AS until, $3::timestamptz AS previous),
business AS MATERIALIZED (SELECT id, created_at, delivered_at, collection_status, delivery_status, deleted_at, purged_at FROM cards WHERE is_test = false),
live_orders AS MATERIALIZED (SELECT o.* FROM payment_orders o JOIN business c ON c.id = o.card_id WHERE $4::boolean AND o.currency = 'RUB' AND o.paid_at IS NOT NULL AND ${livePaymentProof}),
windows AS (SELECT 'current' AS name, since AS start, until AS finish FROM bounds UNION ALL SELECT 'previous', previous, since FROM bounds WHERE previous IS NOT NULL),
metrics AS (SELECT w.name, jsonb_build_object(
  'created', (SELECT count(*) FROM business c WHERE (w.start IS NULL OR c.created_at >= w.start) AND c.created_at < w.finish),
  'paid', CASE WHEN $4 THEN (SELECT count(DISTINCT card_id) FROM live_orders o WHERE (w.start IS NULL OR o.paid_at >= w.start) AND o.paid_at < w.finish) END,
  'revenue', CASE WHEN $4 THEN (SELECT COALESCE(sum(payable_amount), 0) FROM live_orders o WHERE (w.start IS NULL OR o.paid_at >= w.start) AND o.paid_at < w.finish) - (SELECT COALESCE(sum(r.amount), 0) FROM payment_refunds r JOIN live_orders o ON o.id = r.order_id WHERE r.status = 'SUCCEEDED' AND (w.start IS NULL OR r.completed_at >= w.start) AND r.completed_at < w.finish) END,
  'active', (SELECT count(*) FROM business WHERE collection_status = 'OPEN' AND deleted_at IS NULL AND purged_at IS NULL),
  'reminders', CASE WHEN $4 THEN (SELECT count(*) FROM event_reminders r WHERE (w.start IS NULL OR r.created_at >= w.start) AND r.created_at < w.finish AND NOT EXISTS(SELECT 1 FROM cards c WHERE c.id = r.source_card_id AND c.is_test)) END
) AS value FROM windows w),
events AS (
  (SELECT c.id::text, 'Создана открытка' AS label, '/admin/cards/' || c.id AS href, c.created_at AS date, '{}'::jsonb AS context FROM business c WHERE $5::boolean AND c.purged_at IS NULL ORDER BY c.created_at DESC LIMIT 7)
  UNION ALL (SELECT o.id::text, 'Оплачена открытка', '/admin/orders/' || o.id, o.paid_at, jsonb_build_object('amount',o.payable_amount,'currency',o.currency) FROM live_orders o ORDER BY o.paid_at DESC LIMIT 7)
  UNION ALL (SELECT c.id::text || '-delivered', 'Открытка передана', '/admin/cards/' || c.id, c.delivered_at, '{}'::jsonb FROM business c WHERE $5 AND c.delivered_at IS NOT NULL AND c.purged_at IS NULL ORDER BY c.delivered_at DESC LIMIT 7)
  UNION ALL (SELECT r.id::text, 'Получена заявка', '/admin/reminders/' || r.id, r.created_at, jsonb_build_object('occasion',r.occasion_text,'eventDate',r.event_date) FROM event_reminders r WHERE $4 AND NOT EXISTS(SELECT 1 FROM cards c WHERE c.id = r.source_card_id AND c.is_test) ORDER BY r.created_at DESC LIMIT 7)
  UNION ALL (SELECT t.id::text, 'Ошибка отправки', CASE WHEN r.id IS NOT NULL THEN '/admin/reminders/' || r.id END, t.created_at, jsonb_build_object('occasion',r.occasion_text) FROM telemetry_events t LEFT JOIN event_reminders r ON r.id::text=t.context->>'reminderId' WHERE $4 AND t.kind='critical' AND t.context->>'operation'='event_reminder' ORDER BY t.created_at DESC LIMIT 7)
  UNION ALL (SELECT id::text, 'Новое обращение', '/admin/support?request=' || id, created_at, jsonb_build_object('category',category) FROM support_requests ORDER BY created_at DESC LIMIT 7)
), latest AS (SELECT * FROM events WHERE date <= $2 ORDER BY date DESC, id LIMIT 7)
SELECT jsonb_build_object(
  'current', (SELECT value FROM metrics WHERE name = 'current'), 'previous', (SELECT value FROM metrics WHERE name = 'previous'),
  'total', jsonb_build_object('cards', (SELECT count(*) FROM business), 'delivered', (SELECT count(*) FROM business WHERE delivery_status = 'DELIVERED'), 'greetings', (SELECT count(*) FROM contributions g JOIN business c ON c.id = g.card_id), 'photos', (SELECT count(*) FROM card_media_assets m JOIN business c ON c.id = m.card_id)),
  'attention', jsonb_build_object('support', (SELECT count(*) FROM support_requests WHERE status = 'new'), 'reminders', CASE WHEN $4 THEN (SELECT count(*) FROM event_reminders WHERE status = 'failed') ELSE 0 END, 'refunds', CASE WHEN $4 THEN (SELECT count(*) FROM payment_refunds WHERE status = 'CANCELED') ELSE 0 END, 'technical', CASE WHEN $4 THEN (SELECT count(*) FROM telemetry_events WHERE kind = 'critical' AND event IN ('critical.publication', 'critical.media') AND created_at >= $2::timestamptz - interval '7 days') ELSE 0 END),
  'remindersPending', CASE WHEN $4 THEN (SELECT count(*) FROM event_reminders WHERE status IN ('pending','sending') AND remind_on IS NOT NULL) ELSE 0 END,
  'activity', COALESCE((SELECT jsonb_agg(l ORDER BY date DESC, id) FROM latest l), '[]'::jsonb)
) AS overview`;
export async function getAdminOverview(days: AdminPeriod, role: AdminUserRole): Promise<Overview | null> {
  if (!isPostgresConfigured()) return null;
  const until = new Date();
  const since = days === null ? null : new Date(until.getTime() - days * 86400000);
  const previous = days === null ? null : new Date(until.getTime() - days * 2 * 86400000);
  const result = await getPostgresPool().query<{ overview: Overview }>(overviewSql, [since, until, previous, role === "admin", role !== "support"]);
  const overview = result.rows[0].overview;
  return { ...overview, activity: overview.activity.map(formatOverviewActivity) };
}

export function formatOverviewActivity(item: Overview["activity"][number]): Overview["activity"][number] {
  const context = item.context;
  const parts = [item.label];
  if (typeof context?.amount === "number") parts.push(formatMoney(context.amount, context.currency ?? "RUB"));
  if (context?.occasion) parts.push(context.occasion.slice(0,80));
  if (context?.eventDate && !Number.isNaN(Date.parse(context.eventDate))) parts.push(new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Yekaterinburg" }).format(new Date(context.eventDate)));
  const categories: Record<string,string> = { question: "Вопрос", problem: "Проблема", suggestion: "Предложение" };
  if (context?.category && categories[context.category]) parts.push(categories[context.category]);
  return { id: item.id, href: item.href, date: item.date, label: parts.join(" · ") };
}
