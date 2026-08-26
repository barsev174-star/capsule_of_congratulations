import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import { CAREGIVER_LANDING_PATH, COLLEAGUE_LANDING_PATH, TEACHER_LANDING_PATH } from "@/lib/landing-attribution";

export const analyticsLandings = [
  { id: "teacher", path: TEACHER_LANDING_PATH, label: "Учителю" },
  { id: "caregiver", path: CAREGIVER_LANDING_PATH, label: "Воспитателю" },
  { id: "colleague", path: COLLEAGUE_LANDING_PATH, label: "Коллеге" }
] as const;

export type AcquisitionCounts = {
  created: number;
  withGreeting: number;
  paid: number;
  delivered: number;
  opened: number;
  paidOrders: number;
  grossKopecks: number;
  refundedKopecks: number;
};
export type AcquisitionSource = AcquisitionCounts & {
  landing: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};
export type LandingActivity = { landing: string; views: number; exampleClicks: number; createClicks: number };
export type AcquisitionAnalytics = {
  sources: AcquisitionSource[];
  totals: AcquisitionCounts;
  landings: LandingActivity[];
  participants: { submissions: number; identities: number; unidentifiedSubmissions: number };
};

export const emptyAcquisitionCounts = (): AcquisitionCounts => ({
  created: 0, withGreeting: 0, paid: 0, delivered: 0, opened: 0,
  paidOrders: 0, grossKopecks: 0, refundedKopecks: 0
});

export const sumAcquisitionCounts = (sources: AcquisitionCounts[]): AcquisitionCounts =>
  sources.reduce((total, row) => {
    for (const key of Object.keys(total) as Array<keyof AcquisitionCounts>) total[key] += row[key];
    return total;
  }, emptyAcquisitionCounts());

// A cohort shares one denominator. Optional steps and administrative grants make
// adjacent event counts unsuitable for conversion rates.
export const cohortConversion = (count: number, created: number): string =>
  created > 0 ? `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(count / created * 100)}%` : "—";

// All heavy aggregation stays in PostgreSQL. $1 is a bounded number of days;
// $2/$3 map the allowlisted landing types to paths without trusting client labels.
export const acquisitionAnalyticsSql = `
WITH landing_catalog AS (
  SELECT * FROM unnest($2::text[], $3::text[]) AS l(landing, path)
), cohort AS MATERIALIZED (
  SELECT id, created_at, delivered_at, recipient_first_opened_at
  FROM cards WHERE created_at >= now() - ($1 * interval '1 day') AND created_at <= now()
), card_facts AS (
  SELECT c.id, l.landing,
    CASE WHEN l.landing IS NOT NULL THEN COALESCE(NULLIF(left(btrim(t.context->>'utm_source'), 100), ''),
      NULLIF(left(btrim(t.context->>'referrer_host'), 100), '')) END AS source,
    CASE WHEN l.landing IS NOT NULL THEN NULLIF(left(btrim(t.context->>'utm_medium'), 100), '') END AS medium,
    CASE WHEN l.landing IS NOT NULL THEN NULLIF(left(btrim(t.context->>'utm_campaign'), 100), '') END AS campaign,
    EXISTS (SELECT 1 FROM contributions g WHERE g.card_id = c.id AND g.created_at <= now()) AS with_greeting,
    c.delivered_at IS NOT NULL AND c.delivered_at <= now() AS delivered,
    c.recipient_first_opened_at IS NOT NULL AND c.recipient_first_opened_at <= now() AS opened,
    p.orders, p.gross, p.refunded
  FROM cohort c
  LEFT JOIN LATERAL (
    SELECT context FROM telemetry_events
    WHERE card_id = c.id::text AND kind = 'funnel' AND event = 'funnel.card_created'
      AND created_at <= now()
    ORDER BY created_at, id LIMIT 1
  ) t ON true
  LEFT JOIN landing_catalog l ON l.landing = t.context->>'landing_type' AND l.path = t.context->>'landing_path'
  CROSS JOIN LATERAL (
    SELECT count(*) AS orders, COALESCE(sum(o.payable_amount), 0) AS gross,
      COALESCE(sum(o.total_refunded_amount), 0) AS refunded
    FROM payment_orders o
    WHERE o.card_id = c.id AND o.currency = 'RUB' AND o.paid_at <= now()
      AND EXISTS (
        SELECT 1 FROM payment_events e
        JOIN payment_attempts a ON a.id = e.attempt_id AND a.order_id = o.id
        WHERE e.order_id = o.id AND e.provider = 'robokassa' AND e.event_type = 'payment_succeeded'
          AND e.processed_at <= now() AND a.provider = 'robokassa' AND a.status = 'SUCCEEDED'
          -- The saved checkout URL preserves test mode even if a merchant account changes later.
          AND a.confirmation_url LIKE 'https://auth.robokassa.ru/Merchant/Index.aspx?%'
          AND a.confirmation_url !~* '[?&]IsTest=1(&|$)'
          AND COALESCE(a.provider_payload->'result'->>'IsTest', '0') <> '1'
          AND COALESCE(e.payload->>'IsTest', '0') <> '1'
      )
  ) p
), source_groups AS (
  SELECT landing, source, medium, campaign,
    count(*) AS created, count(*) FILTER (WHERE with_greeting) AS "withGreeting",
    count(*) FILTER (WHERE orders > 0) AS paid,
    count(*) FILTER (WHERE delivered) AS delivered, count(*) FILTER (WHERE opened) AS opened,
    sum(orders) AS "paidOrders", sum(gross) AS "grossKopecks", sum(refunded) AS "refundedKopecks"
  FROM card_facts GROUP BY landing, source, medium, campaign
), landing_activity AS (
  SELECT l.landing,
    count(*) FILTER (WHERE t.event = 'seo_landing_view') AS views,
    count(*) FILTER (WHERE t.event = 'seo_example_click') AS "exampleClicks",
    count(*) FILTER (WHERE t.event = 'seo_create_click') AS "createClicks"
  FROM landing_catalog l LEFT JOIN telemetry_events t
    ON t.context->>'landing_type' = l.landing AND t.context->>'landing_path' = l.path
    AND t.kind = 'funnel' AND t.event IN ('seo_landing_view', 'seo_example_click', 'seo_create_click')
    AND t.created_at >= now() - ($1 * interval '1 day') AND t.created_at <= now()
  GROUP BY l.landing
), participants AS (
  SELECT count(*) AS submissions,
    count(DISTINCT (card_id, participant_token_hash)) FILTER (WHERE NULLIF(participant_token_hash, '') IS NOT NULL) AS identities,
    count(*) FILTER (WHERE NULLIF(participant_token_hash, '') IS NULL) AS "unidentifiedSubmissions"
  FROM contributions WHERE source = 'participant'
    AND created_at >= now() - ($1 * interval '1 day') AND created_at <= now()
)
SELECT
  COALESCE((SELECT jsonb_agg(s ORDER BY created DESC, landing NULLS LAST, source NULLS LAST, medium NULLS LAST, campaign NULLS LAST) FROM source_groups s), '[]'::jsonb) AS sources,
  (SELECT jsonb_agg(l ORDER BY landing) FROM landing_activity l) AS landings,
  (SELECT to_jsonb(p) FROM participants p) AS participants
`;

export const getAcquisitionAnalytics = async (days: number): Promise<AcquisitionAnalytics | null> => {
  // JSON development storage has no verified payment ledger. Do not invent zero sales.
  if (!isPostgresConfigured()) return null;
  const result = await getPostgresPool().query<Omit<AcquisitionAnalytics, "totals">>(acquisitionAnalyticsSql, [
    days === 30 ? 30 : 7, analyticsLandings.map((l) => l.id), analyticsLandings.map((l) => l.path)
  ]);
  const row = result.rows[0];
  return { ...row, totals: sumAcquisitionCounts(row.sources) };
};
