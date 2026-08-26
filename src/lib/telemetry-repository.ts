import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { LogContext } from "@/lib/logger";

export type TelemetryKind = "funnel" | "critical" | "client_error";
export type TelemetryEvent = {
  id: string;
  kind: TelemetryKind;
  event: string;
  cardId: string | null;
  context: LogContext;
  errorId: string | null;
  createdAt: string;
};

export type TelemetrySummary = {
  totalEvents: number;
  uniqueCards: number;
  criticalErrors: number;
  funnel: Array<{ event: string; count: number }>;
  recentCritical: TelemetryEvent[];
  aiCost: {
    generations: number;
    cards: number;
    totalRub: number;
    averageGenerationRub: number;
    averageCardRub: number;
  };
};

const filePath = join(process.cwd(), "data", "telemetry-events.json");

const readJson = async (): Promise<TelemetryEvent[]> => {
  try { return JSON.parse(await readFile(filePath, "utf8")) as TelemetryEvent[]; } catch { return []; }
};

const writeJson = async (items: TelemetryEvent[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(items.slice(-10_000), null, 2), "utf8");
};

export const recordTelemetryEvent = async (input: Omit<TelemetryEvent, "id" | "createdAt">) => {
  const item: TelemetryEvent = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `INSERT INTO telemetry_events (id, kind, event, card_id, context, error_id, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [item.id, item.kind, item.event, item.cardId, JSON.stringify(item.context), item.errorId, item.createdAt]
    );
    return item;
  }
  const items = await readJson();
  items.push(item);
  await writeJson(items);
  return item;
};

export const getTelemetrySummary = async (days: number): Promise<TelemetrySummary> => {
  const safeDays = days === 30 ? 30 : 7;
  let items: TelemetryEvent[];
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ summary: TelemetrySummary }>(telemetrySummarySql, [safeDays]);
    return result.rows[0].summary;
  } else {
    const since = Date.now() - safeDays * 86_400_000;
    items = (await readJson()).filter((item) => {
      const timestamp = new Date(item.createdAt).getTime();
      return timestamp >= since && timestamp <= Date.now();
    }).reverse();
  }

  const counts = new Map<string, number>();
  for (const item of items.filter((entry) => entry.kind === "funnel")) counts.set(item.event, (counts.get(item.event) ?? 0) + 1);
  const aiCostEvents = items.filter((item) => item.event === "ai.two_stage_generation" && typeof item.context.totalCostRub === "number");
  const aiCostTotal = aiCostEvents.reduce((sum, item) => sum + (item.context.totalCostRub as number), 0);
  const aiCostCards = new Set(aiCostEvents.map((item) => item.cardId).filter((cardId): cardId is string => Boolean(cardId)));
  const roundRub = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  return {
    totalEvents: items.length,
    uniqueCards: new Set(items.map((item) => item.cardId).filter(Boolean)).size,
    criticalErrors: items.filter((item) => item.kind !== "funnel").length,
    funnel: [...counts].map(([event, count]) => ({ event, count })),
    recentCritical: items.filter((item) => item.kind !== "funnel").slice(0, 30),
    aiCost: {
      generations: aiCostEvents.length,
      cards: aiCostCards.size,
      totalRub: roundRub(aiCostTotal),
      averageGenerationRub: aiCostEvents.length ? roundRub(aiCostTotal / aiCostEvents.length) : 0,
      averageCardRub: aiCostCards.size ? roundRub(aiCostTotal / aiCostCards.size) : 0
    }
  };
};

// Aggregate the complete period in the database; only the error detail list is capped.
export const telemetrySummarySql = `
WITH period AS MATERIALIZED (
  SELECT * FROM telemetry_events
  WHERE created_at >= now() - ($1 * interval '1 day') AND created_at <= now()
), ai AS (
  SELECT card_id, (context->>'totalCostRub')::numeric AS cost FROM period
  WHERE event = 'ai.two_stage_generation' AND jsonb_typeof(context->'totalCostRub') = 'number'
), funnel AS (
  SELECT event, count(*) AS count FROM period WHERE kind = 'funnel' GROUP BY event
), recent AS (
  SELECT id, kind, event, card_id AS "cardId", '{}'::jsonb AS context,
    error_id AS "errorId", created_at AS "createdAt"
  FROM period WHERE kind <> 'funnel' ORDER BY created_at DESC, id LIMIT 30
)
SELECT jsonb_build_object(
  'totalEvents', (SELECT count(*) FROM period),
  'uniqueCards', (SELECT count(DISTINCT card_id) FROM period),
  'criticalErrors', (SELECT count(*) FROM period WHERE kind <> 'funnel'),
  'funnel', COALESCE((SELECT jsonb_agg(f) FROM funnel f), '[]'::jsonb),
  'recentCritical', COALESCE((SELECT jsonb_agg(r ORDER BY r."createdAt" DESC, r.id) FROM recent r), '[]'::jsonb),
  'aiCost', (SELECT jsonb_build_object(
    'generations', count(*), 'cards', count(DISTINCT card_id),
    'totalRub', round(COALESCE(sum(cost), 0), 6),
    'averageGenerationRub', round(COALESCE(avg(cost), 0), 6),
    'averageCardRub', round(COALESCE(sum(cost) / NULLIF(count(DISTINCT card_id), 0), 0), 6)
  ) FROM ai)
) AS summary
`;
