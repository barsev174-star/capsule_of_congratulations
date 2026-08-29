import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type {
  ClaimedSupportNotification,
  SupportNotificationChannel,
  SupportNotificationDelivery,
  SupportNotificationStatus,
  SupportRequest
} from "./types";

const deliveriesFilePath = join(process.cwd(), "data", "support-notification-deliveries.json");
const requestsFilePath = join(process.cwd(), "data", "support-requests.json");
const maxAttempts = 5;

type DeliveryRow = {
  id: string;
  support_request_id: string;
  channel: SupportNotificationChannel;
  status: SupportNotificationStatus;
  attempt_count: number;
  next_attempt_at: Date | string;
  locked_at: Date | string | null;
  last_error: string | null;
  sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ClaimedDeliveryRow = DeliveryRow & {
  request_category: SupportRequest["category"];
  request_contact_name: string | null;
  request_email: string;
  request_message: string;
  request_source: string;
  request_status: SupportRequest["status"];
  request_created_at: Date | string;
  request_updated_at: Date | string;
};

const toIso = (value: Date | string) => value instanceof Date ? value.toISOString() : value;
const toNullableIso = (value: Date | string | null) => value === null ? null : toIso(value);

const mapDeliveryRow = (row: DeliveryRow): SupportNotificationDelivery => ({
  id: row.id,
  supportRequestId: row.support_request_id,
  channel: row.channel,
  status: row.status,
  attemptCount: row.attempt_count,
  nextAttemptAt: toIso(row.next_attempt_at),
  lockedAt: toNullableIso(row.locked_at),
  lastError: row.last_error,
  sentAt: toNullableIso(row.sent_at),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const mapClaimedRow = (row: ClaimedDeliveryRow): ClaimedSupportNotification => ({
  ...mapDeliveryRow(row),
  request: {
    id: row.support_request_id,
    category: row.request_category,
    contactName: row.request_contact_name,
    email: row.request_email,
    message: row.request_message,
    source: row.request_source,
    status: row.request_status,
    createdAt: toIso(row.request_created_at),
    updatedAt: toIso(row.request_updated_at)
  }
});

const readDeliveriesJson = async (): Promise<SupportNotificationDelivery[]> => {
  try {
    return JSON.parse(await readFile(deliveriesFilePath, "utf8")) as SupportNotificationDelivery[];
  } catch {
    return [];
  }
};

const writeDeliveriesJson = async (items: SupportNotificationDelivery[]) => {
  await mkdir(dirname(deliveriesFilePath), { recursive: true });
  await writeFile(deliveriesFilePath, JSON.stringify(items, null, 2), "utf8");
};

const readRequestsJson = async (): Promise<SupportRequest[]> => {
  try {
    return JSON.parse(await readFile(requestsFilePath, "utf8")) as SupportRequest[];
  } catch {
    return [];
  }
};

export const appendSupportNotificationDeliveries = async (
  supportRequestId: string,
  channels: SupportNotificationChannel[],
  now = new Date().toISOString()
) => {
  if (isPostgresConfigured() || channels.length === 0) return;
  const items = await readDeliveriesJson();
  const existingChannels = new Set(
    items.filter((item) => item.supportRequestId === supportRequestId).map((item) => item.channel)
  );
  for (const channel of [...new Set(channels)]) {
    if (existingChannels.has(channel)) continue;
    items.push({
      id: randomUUID(),
      supportRequestId,
      channel,
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: now,
      lockedAt: null,
      lastError: null,
      sentAt: null,
      createdAt: now,
      updatedAt: now
    });
  }
  await writeDeliveriesJson(items);
};

export const claimSupportNotifications = async (options: {
  limit?: number;
  requestId?: string;
  deliveryId?: string;
} = {}): Promise<ClaimedSupportNotification[]> => {
  const limit = Math.max(1, Math.min(options.limit ?? 25, 50));
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<ClaimedDeliveryRow>(
      `WITH due AS (
         SELECT delivery.id
         FROM support_notification_deliveries AS delivery
         WHERE delivery.attempt_count < $1
           AND delivery.channel = 'email'
           AND ($3::uuid IS NULL OR delivery.support_request_id = $3)
           AND ($4::uuid IS NULL OR delivery.id = $4)
           AND (
             (delivery.status IN ('pending', 'failed') AND delivery.next_attempt_at <= NOW())
             OR (delivery.status = 'sending' AND (delivery.locked_at IS NULL OR delivery.locked_at < $5))
           )
         ORDER BY delivery.next_attempt_at, delivery.created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       ), claimed AS (
         UPDATE support_notification_deliveries AS delivery
         SET status = 'sending',
             attempt_count = delivery.attempt_count + 1,
             locked_at = NOW(),
             updated_at = NOW()
         FROM due
         WHERE delivery.id = due.id
         RETURNING delivery.*
       )
       SELECT claimed.*,
              request.category AS request_category,
              request.contact_name AS request_contact_name,
              request.email AS request_email,
              request.message AS request_message,
              request.source AS request_source,
              request.status AS request_status,
              request.created_at AS request_created_at,
              request.updated_at AS request_updated_at
       FROM claimed
       JOIN support_requests AS request ON request.id = claimed.support_request_id`,
      [maxAttempts, limit, options.requestId ?? null, options.deliveryId ?? null, staleBefore]
    );
    return result.rows.map(mapClaimedRow);
  }

  const deliveries = await readDeliveriesJson();
  const requests = await readRequestsJson();
  const requestById = new Map(requests.map((request) => [request.id, request]));
  const now = new Date().toISOString();
  const claimedIds = new Set(
    deliveries
      .filter((delivery) =>
        delivery.channel === "email"
        && delivery.attemptCount < maxAttempts
        && (!options.requestId || delivery.supportRequestId === options.requestId)
        && (!options.deliveryId || delivery.id === options.deliveryId)
        && (
          ((delivery.status === "pending" || delivery.status === "failed") && delivery.nextAttemptAt <= now)
          || (delivery.status === "sending" && (!delivery.lockedAt || delivery.lockedAt < staleBefore))
        )
      )
      .sort((a, b) => a.nextAttemptAt.localeCompare(b.nextAttemptAt) || a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map((delivery) => delivery.id)
  );
  const updated = deliveries.map((delivery) => claimedIds.has(delivery.id)
    ? {
        ...delivery,
        status: "sending" as const,
        attemptCount: delivery.attemptCount + 1,
        lockedAt: now,
        updatedAt: now
      }
    : delivery);
  await writeDeliveriesJson(updated);
  return updated.flatMap((delivery) => {
    if (!claimedIds.has(delivery.id)) return [];
    const request = requestById.get(delivery.supportRequestId);
    return request ? [{ ...delivery, request }] : [];
  });
};

export const completeSupportNotification = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `UPDATE support_notification_deliveries
       SET status = 'sent', sent_at = $2, locked_at = NULL, last_error = NULL, updated_at = $2
       WHERE id = $1 AND status = 'sending'`,
      [id, now]
    );
    return;
  }
  const items = await readDeliveriesJson();
  await writeDeliveriesJson(items.map((item) => item.id === id && item.status === "sending"
    ? { ...item, status: "sent" as const, sentAt: now, lockedAt: null, lastError: null, updatedAt: now }
    : item));
};

const retryDelayMs = (attemptCount: number) => {
  const delays = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000];
  return delays[Math.max(0, Math.min(attemptCount - 1, delays.length - 1))];
};

export const failSupportNotification = async (id: string, error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
  const now = new Date();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `UPDATE support_notification_deliveries
       SET status = 'failed',
           next_attempt_at = NOW() + CASE attempt_count
             WHEN 1 THEN INTERVAL '1 minute'
             WHEN 2 THEN INTERVAL '5 minutes'
             WHEN 3 THEN INTERVAL '30 minutes'
             WHEN 4 THEN INTERVAL '2 hours'
             ELSE INTERVAL '6 hours'
           END,
           locked_at = NULL,
           last_error = $2,
           updated_at = NOW()
       WHERE id = $1 AND status = 'sending'`,
      [id, message]
    );
    return;
  }
  const items = await readDeliveriesJson();
  await writeDeliveriesJson(items.map((item) => item.id === id && item.status === "sending"
    ? {
        ...item,
        status: "failed" as const,
        nextAttemptAt: new Date(now.getTime() + retryDelayMs(item.attemptCount)).toISOString(),
        lockedAt: null,
        lastError: message,
        updatedAt: now.toISOString()
      }
    : item));
};

export const retrySupportNotification = async (id: string): Promise<boolean> => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query(
      `UPDATE support_notification_deliveries
       SET status = 'pending', attempt_count = 0, next_attempt_at = $2,
           locked_at = NULL, last_error = NULL, updated_at = $2
       WHERE id = $1 AND status = 'failed'`,
      [id, now]
    );
    return (result.rowCount ?? 0) > 0;
  }
  const items = await readDeliveriesJson();
  let changed = false;
  const updated = items.map((item) => {
    if (item.id !== id || item.status !== "failed") return item;
    changed = true;
    return {
      ...item,
      status: "pending" as const,
      attemptCount: 0,
      nextAttemptAt: now,
      lockedAt: null,
      lastError: null,
      updatedAt: now
    };
  });
  if (changed) await writeDeliveriesJson(updated);
  return changed;
};

export const listSupportNotificationDeliveries = async (
  supportRequestIds: string[]
): Promise<SupportNotificationDelivery[]> => {
  if (supportRequestIds.length === 0) return [];
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<DeliveryRow>(
      `SELECT * FROM support_notification_deliveries
       WHERE support_request_id = ANY($1::uuid[])
         AND channel = 'email'
       ORDER BY created_at`,
      [supportRequestIds]
    );
    return result.rows.map(mapDeliveryRow);
  }
  const idSet = new Set(supportRequestIds);
  return (await readDeliveriesJson()).filter((item) => item.channel === "email" && idSet.has(item.supportRequestId));
};
