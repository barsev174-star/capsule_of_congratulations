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

export type AiCostStage = {
  totalRub: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiCostGeneration = {
  id: string;
  event: "ai.join_single_generation" | "ai.two_stage_generation";
  cardId: string | null;
  createdAt: string;
  action: string | null;
  extractorModel: string | null;
  composerModel: string | null;
  cacheHit: boolean;
  extractor: AiCostStage;
  composer: AiCostStage;
  repair: AiCostStage;
  repairCount: number;
  repairReasons: string[];
  totalCostRub: number;
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
    extractorRub: number;
    composerRub: number;
    repairRub: number;
    repairs: number;
    cacheHits: number;
    recent: AiCostGeneration[];
  };
};

const aiCostEvents = new Set(["ai.join_single_generation", "ai.two_stage_generation"]);

const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const stringValue = (value: unknown) => typeof value === "string" && value.trim() ? value : null;

const normalizeAiCostStage = (value: unknown): AiCostStage => {
  const usage = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    totalRub: finiteNumber(usage.totalRub),
    inputTokens: finiteNumber(usage.inputTokens),
    cachedInputTokens: finiteNumber(usage.cachedInputTokens),
    outputTokens: finiteNumber(usage.outputTokens),
    totalTokens: finiteNumber(usage.totalTokens)
  };
};

const normalizeAiCostGeneration = (item: TelemetryEvent): AiCostGeneration | null => {
  if (!aiCostEvents.has(item.event) || typeof item.context.totalCostRub !== "number") return null;
  const repairUsages = Array.isArray(item.context.repairUsage) ? item.context.repairUsage : [];
  const repairs = repairUsages.map(normalizeAiCostStage);
  const repair = repairs.reduce<AiCostStage>((sum, stage) => ({
    totalRub: sum.totalRub + stage.totalRub,
    inputTokens: sum.inputTokens + stage.inputTokens,
    cachedInputTokens: sum.cachedInputTokens + stage.cachedInputTokens,
    outputTokens: sum.outputTokens + stage.outputTokens,
    totalTokens: sum.totalTokens + stage.totalTokens
  }), normalizeAiCostStage(null));
  const repairReasons = Array.isArray(item.context.repairReason)
    ? item.context.repairReason.filter((value): value is string => typeof value === "string")
    : [];

  return {
    id: item.id,
    event: item.event as AiCostGeneration["event"],
    cardId: item.cardId,
    createdAt: item.createdAt,
    action: stringValue(item.context.action),
    extractorModel: stringValue(item.context.extractorModel),
    composerModel: stringValue(item.context.composerModel),
    cacheHit: item.context.cacheHit === true,
    extractor: normalizeAiCostStage(item.context.extractorUsage),
    composer: normalizeAiCostStage(item.context.composerUsage),
    repair,
    repairCount: repairs.length,
    repairReasons,
    totalCostRub: finiteNumber(item.context.totalCostRub)
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
    const pool = getPostgresPool();
    const [result, detailResult] = await Promise.all([
      pool.query<{ summary: Omit<TelemetrySummary, "aiCost"> & { aiCost: Omit<TelemetrySummary["aiCost"], "recent"> } }>(telemetrySummarySql, [safeDays]),
      pool.query<TelemetryEvent>(telemetryAiDetailSql, [safeDays])
    ]);
    return {
      ...result.rows[0].summary,
      aiCost: {
        ...result.rows[0].summary.aiCost,
        recent: detailResult.rows.map(normalizeAiCostGeneration).filter((item): item is AiCostGeneration => Boolean(item))
      }
    };
  } else {
    const since = Date.now() - safeDays * 86_400_000;
    items = (await readJson()).filter((item) => {
      const timestamp = new Date(item.createdAt).getTime();
      return timestamp >= since && timestamp <= Date.now();
    }).reverse();
  }

  const counts = new Map<string, number>();
  for (const item of items.filter((entry) => entry.kind === "funnel")) counts.set(item.event, (counts.get(item.event) ?? 0) + 1);
  const aiGenerations = items.map(normalizeAiCostGeneration).filter((item): item is AiCostGeneration => Boolean(item));
  const aiCostTotal = aiGenerations.reduce((sum, item) => sum + item.totalCostRub, 0);
  const aiCostCards = new Set(aiGenerations.map((item) => item.cardId).filter((cardId): cardId is string => Boolean(cardId)));
  const roundRub = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  return {
    totalEvents: items.length,
    uniqueCards: new Set(items.map((item) => item.cardId).filter(Boolean)).size,
    criticalErrors: items.filter((item) => item.kind !== "funnel").length,
    funnel: [...counts].map(([event, count]) => ({ event, count })),
    recentCritical: items.filter((item) => item.kind !== "funnel").slice(0, 30),
    aiCost: {
      generations: aiGenerations.length,
      cards: aiCostCards.size,
      totalRub: roundRub(aiCostTotal),
      averageGenerationRub: aiGenerations.length ? roundRub(aiCostTotal / aiGenerations.length) : 0,
      averageCardRub: aiCostCards.size ? roundRub(aiCostTotal / aiCostCards.size) : 0,
      extractorRub: roundRub(aiGenerations.reduce((sum, item) => sum + item.extractor.totalRub, 0)),
      composerRub: roundRub(aiGenerations.reduce((sum, item) => sum + item.composer.totalRub, 0)),
      repairRub: roundRub(aiGenerations.reduce((sum, item) => sum + item.repair.totalRub, 0)),
      repairs: aiGenerations.reduce((sum, item) => sum + item.repairCount, 0),
      cacheHits: aiGenerations.filter((item) => item.cacheHit).length,
      recent: aiGenerations.slice(0, 50)
    }
  };
};

// Aggregate the complete period in the database; only the error detail list is capped.
export const telemetrySummarySql = `
WITH period AS MATERIALIZED (
  SELECT * FROM telemetry_events
  WHERE created_at >= now() - ($1 * interval '1 day') AND created_at <= now()
), ai AS (
  SELECT card_id,
    (context->>'totalCostRub')::numeric AS cost,
    CASE WHEN jsonb_typeof(context->'extractorUsage'->'totalRub') = 'number'
      THEN (context->'extractorUsage'->>'totalRub')::numeric ELSE 0 END AS extractor_cost,
    CASE WHEN jsonb_typeof(context->'composerUsage'->'totalRub') = 'number'
      THEN (context->'composerUsage'->>'totalRub')::numeric ELSE 0 END AS composer_cost,
    CASE WHEN jsonb_typeof(context->'repairUsage') = 'array' THEN (
      SELECT COALESCE(sum((usage->>'totalRub')::numeric), 0)
      FROM jsonb_array_elements(context->'repairUsage') usage
      WHERE jsonb_typeof(usage->'totalRub') = 'number'
    ) ELSE 0 END AS repair_cost,
    CASE WHEN jsonb_typeof(context->'repairUsage') = 'array'
      THEN jsonb_array_length(context->'repairUsage') ELSE 0 END AS repair_count,
    context->'cacheHit' = 'true'::jsonb AS cache_hit
  FROM period
  WHERE event IN ('ai.join_single_generation', 'ai.two_stage_generation')
    AND jsonb_typeof(context->'totalCostRub') = 'number'
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
    'averageCardRub', round(COALESCE(sum(cost) / NULLIF(count(DISTINCT card_id), 0), 0), 6),
    'extractorRub', round(COALESCE(sum(extractor_cost), 0), 6),
    'composerRub', round(COALESCE(sum(composer_cost), 0), 6),
    'repairRub', round(COALESCE(sum(repair_cost), 0), 6),
    'repairs', COALESCE(sum(repair_count), 0),
    'cacheHits', count(*) FILTER (WHERE cache_hit)
  ) FROM ai)
) AS summary
`;

export const telemetryAiDetailSql = `
SELECT id, kind, event, card_id AS "cardId", context,
  error_id AS "errorId", created_at::text AS "createdAt"
FROM telemetry_events
WHERE created_at >= now() - ($1 * interval '1 day') AND created_at <= now()
  AND event IN ('ai.join_single_generation', 'ai.two_stage_generation')
  AND jsonb_typeof(context->'totalCostRub') = 'number'
ORDER BY created_at DESC, id
LIMIT 50
`;
