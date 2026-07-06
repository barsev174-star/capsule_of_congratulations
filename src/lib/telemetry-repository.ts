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
    return;
  }
  const items = await readJson();
  items.push(item);
  await writeJson(items);
};

export const getTelemetrySummary = async (days: number): Promise<TelemetrySummary> => {
  const safeDays = days === 30 ? 30 : 7;
  let items: TelemetryEvent[];
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{
      id: string; kind: TelemetryKind; event: string; card_id: string | null; context: LogContext;
      error_id: string | null; created_at: Date | string;
    }>(`SELECT id, kind, event, card_id, context, error_id, created_at
        FROM telemetry_events WHERE created_at >= now() - ($1 * interval '1 day') ORDER BY created_at DESC LIMIT 10000`, [safeDays]);
    items = result.rows.map((row) => ({
      id: row.id, kind: row.kind, event: row.event, cardId: row.card_id, context: row.context,
      errorId: row.error_id, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    }));
  } else {
    const since = Date.now() - safeDays * 86_400_000;
    items = (await readJson()).filter((item) => new Date(item.createdAt).getTime() >= since).reverse();
  }

  const counts = new Map<string, number>();
  for (const item of items.filter((entry) => entry.kind === "funnel")) counts.set(item.event, (counts.get(item.event) ?? 0) + 1);
  return {
    totalEvents: items.length,
    uniqueCards: new Set(items.map((item) => item.cardId).filter(Boolean)).size,
    criticalErrors: items.filter((item) => item.kind !== "funnel").length,
    funnel: [...counts].map(([event, count]) => ({ event, count })),
    recentCritical: items.filter((item) => item.kind !== "funnel").slice(0, 30)
  };
};
