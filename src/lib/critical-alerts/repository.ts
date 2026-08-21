import { createHash, randomUUID } from "node:crypto";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { LogContext } from "@/lib/logger";
import type {
  CriticalAlertChannel,
  CriticalAlertDelivery,
  CriticalAlertStatus
} from "./types";

const maxAttempts = 5;
const dedupeMinutes = 15;

type DeliveryRow = {
  id: string;
  error_id: string;
  event: string;
  fingerprint: string;
  channel: CriticalAlertChannel;
  context: LogContext;
  status: CriticalAlertStatus;
  attempt_count: number;
  next_attempt_at: Date | string;
  locked_at: Date | string | null;
  last_error: string | null;
  sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string) => value instanceof Date ? value.toISOString() : value;
const toNullableIso = (value: Date | string | null) => value === null ? null : toIso(value);

const mapDeliveryRow = (row: DeliveryRow): CriticalAlertDelivery => ({
  id: row.id,
  errorId: row.error_id,
  event: row.event,
  fingerprint: row.fingerprint,
  channel: row.channel,
  context: row.context,
  status: row.status,
  attemptCount: row.attempt_count,
  nextAttemptAt: toIso(row.next_attempt_at),
  lockedAt: toNullableIso(row.locked_at),
  lastError: row.last_error,
  sentAt: toNullableIso(row.sent_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const fingerprintContextKeys = ["operation", "route", "channel", "component", "step", "template"] as const;

export const createCriticalAlertFingerprint = (event: string, context: LogContext = {}) => {
  const stableContext = Object.fromEntries(
    fingerprintContextKeys.flatMap((key) => {
      const value = context[key];
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? [[key, value] as const]
        : [];
    })
  );
  return createHash("sha256").update(JSON.stringify({ event, context: stableContext })).digest("hex");
};

export const enqueueCriticalAlert = async (input: {
  errorId: string;
  event: string;
  context: LogContext;
  channels: CriticalAlertChannel[];
}) => {
  const channels = [...new Set(input.channels)];
  if (!isPostgresConfigured() || channels.length === 0) return 0;

  const fingerprint = createCriticalAlertFingerprint(input.event, input.context);
  const pool = getPostgresPool();
  const client = await pool.connect();
  let inserted = 0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [fingerprint]);
    for (const channel of channels) {
      const recent = await client.query(
        `SELECT 1 FROM critical_alert_deliveries
         WHERE fingerprint = $1 AND channel = $2
           AND created_at >= NOW() - ($3 * INTERVAL '1 minute')
           AND status IN ('pending', 'sending', 'sent', 'failed')
         LIMIT 1`,
        [fingerprint, channel, dedupeMinutes]
      );
      if ((recent.rowCount ?? 0) > 0) continue;
      await client.query(
        `INSERT INTO critical_alert_deliveries (
           id, error_id, event, fingerprint, channel, context, status,
           attempt_count, next_attempt_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending', 0, NOW(), NOW(), NOW())`,
        [randomUUID(), input.errorId, input.event, fingerprint, channel, JSON.stringify(input.context)]
      );
      inserted += 1;
    }
    await client.query("COMMIT");
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const claimCriticalAlerts = async (limit = 25): Promise<CriticalAlertDelivery[]> => {
  if (!isPostgresConfigured()) return [];
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const result = await getPostgresPool().query<DeliveryRow>(
    `WITH due AS (
       SELECT id
       FROM critical_alert_deliveries
       WHERE attempt_count < $1
         AND (
           (status IN ('pending', 'failed') AND next_attempt_at <= NOW())
           OR (status = 'sending' AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '10 minutes'))
         )
       ORDER BY next_attempt_at, created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $2
     )
     UPDATE critical_alert_deliveries AS delivery
     SET status = 'sending', attempt_count = delivery.attempt_count + 1,
         locked_at = NOW(), updated_at = NOW()
     FROM due
     WHERE delivery.id = due.id
     RETURNING delivery.*`,
    [maxAttempts, safeLimit]
  );
  return result.rows.map(mapDeliveryRow);
};

export const completeCriticalAlert = async (id: string) => {
  if (!isPostgresConfigured()) return;
  await getPostgresPool().query(
    `UPDATE critical_alert_deliveries
     SET status = 'sent', sent_at = NOW(), locked_at = NULL, last_error = NULL, updated_at = NOW()
     WHERE id = $1 AND status = 'sending'`,
    [id]
  );
};

export const failCriticalAlert = async (id: string, error: unknown) => {
  if (!isPostgresConfigured()) return;
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  await getPostgresPool().query(
    `UPDATE critical_alert_deliveries
     SET status = 'failed',
         next_attempt_at = NOW() + CASE attempt_count
           WHEN 1 THEN INTERVAL '1 minute'
           WHEN 2 THEN INTERVAL '5 minutes'
           WHEN 3 THEN INTERVAL '30 minutes'
           WHEN 4 THEN INTERVAL '2 hours'
           ELSE INTERVAL '6 hours'
         END,
         locked_at = NULL, last_error = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'sending'`,
    [id, message]
  );
};
