import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type {
  CreateEventReminderInput,
  EventReminder,
  EventReminderSchedule,
  EventReminderStatus
} from "./types";

const filePath = join(process.cwd(), "data", "event-reminders.json");

const createCancellationToken = (id: string) => {
  const secret = process.env.REMINDER_TOKEN_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("REMINDER_TOKEN_SECRET is not configured");
  }
  return createHmac("sha256", secret || "local-reminder-token-secret").update(id).digest("base64url");
};

type EventReminderRow = {
  id: string;
  recipient_name: string;
  occasion_text: string;
  event_date: Date | string;
  remind_on: Date | string | null;
  schedule: EventReminderSchedule;
  email: string;
  source_card_id: string | null;
  dedupe_key: string;
  cancel_token_hash: string | null;
  confirmation_sent_at: Date | string | null;
  attempt_count: number;
  locked_at: Date | string | null;
  status: EventReminderStatus;
  sent_at: Date | string | null;
  cancelled_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string | null) =>
  value === null ? null : value instanceof Date ? value.toISOString() : value;
const toDateOnly = (value: Date | string) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

const mapRow = (row: EventReminderRow): EventReminder => ({
  id: row.id,
  recipientName: row.recipient_name,
  occasionText: row.occasion_text,
  eventDate: toDateOnly(row.event_date),
  remindOn: row.remind_on === null ? null : toDateOnly(row.remind_on),
  schedule: row.schedule,
  email: row.email,
  sourceCardId: row.source_card_id,
  dedupeKey: row.dedupe_key,
  cancellationTokenHash: row.cancel_token_hash,
  confirmationSentAt: toIso(row.confirmation_sent_at),
  attemptCount: row.attempt_count ?? 0,
  lockedAt: toIso(row.locked_at ?? null),
  status: row.status,
  sentAt: toIso(row.sent_at),
  cancelledAt: toIso(row.cancelled_at),
  createdAt: toIso(row.created_at) ?? "",
  updatedAt: toIso(row.updated_at) ?? ""
});

const readJson = async (): Promise<EventReminder[]> => {
  try {
    const items = JSON.parse(await readFile(filePath, "utf8")) as Array<Partial<EventReminder>>;
    return items.map((item) => ({
      ...item,
      schedule: item.schedule ?? "seven_days_before",
      cancellationTokenHash: item.cancellationTokenHash ?? null,
      confirmationSentAt: item.confirmationSentAt ?? null,
      attemptCount: item.attemptCount ?? 0,
      lockedAt: item.lockedAt ?? null
    })) as EventReminder[];
  } catch {
    return [];
  }
};

const writeJson = async (items: EventReminder[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
};

export const countRecentEventReminders = async (email: string, since: Date): Promise<number> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM event_reminders WHERE email = $1 AND created_at >= $2",
      [email, since]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  return (await readJson()).filter(
    (item) => item.email === email && new Date(item.createdAt).getTime() >= since.getTime()
  ).length;
};

export const createEventReminder = async (
  input: CreateEventReminderInput
): Promise<{ reminder: EventReminder; created: boolean; cancellationToken: string | null }> => {
  const now = new Date().toISOString();
  const id = randomUUID();
  const cancellationToken = createCancellationToken(id);
  const cancellationTokenHash = createHash("sha256").update(cancellationToken).digest("hex");
  const item: EventReminder = {
    id,
    ...input,
    status: "pending",
    cancellationTokenHash,
    confirmationSentAt: null,
    attemptCount: 0,
    lockedAt: null,
    sentAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<EventReminderRow>(
      `INSERT INTO event_reminders
        (id, recipient_name, occasion_text, event_date, remind_on, schedule, email, source_card_id, dedupe_key,
         cancel_token_hash, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING *`,
      [
        item.id,
        item.recipientName,
        item.occasionText,
        item.eventDate,
        item.remindOn,
        item.schedule,
        item.email,
        item.sourceCardId,
        item.dedupeKey,
        item.cancellationTokenHash,
        item.status,
        now,
        now
      ]
    );

    if (result.rows[0]) {
      return { reminder: mapRow(result.rows[0]), created: true, cancellationToken };
    }

    const existing = await getPostgresPool().query<EventReminderRow>(
      "SELECT * FROM event_reminders WHERE dedupe_key = $1 LIMIT 1",
      [item.dedupeKey]
    );
    const existingReminder = mapRow(existing.rows[0]);
    if (existingReminder.status === "pending" && existingReminder.confirmationSentAt === null) {
      const existingCancellationToken = createCancellationToken(existingReminder.id);
      const existingTokenHash = createHash("sha256").update(existingCancellationToken).digest("hex");
      const refreshed = await getPostgresPool().query<EventReminderRow>(
        `UPDATE event_reminders
         SET cancel_token_hash = $2, updated_at = $3
         WHERE id = $1 AND status = 'pending' AND confirmation_sent_at IS NULL
         RETURNING *`,
        [existingReminder.id, existingTokenHash, now]
      );
      if (refreshed.rows[0]) {
        return { reminder: mapRow(refreshed.rows[0]), created: false, cancellationToken: existingCancellationToken };
      }
    }
    return { reminder: existingReminder, created: false, cancellationToken: null };
  }

  const items = await readJson();
  const existing = items.find((reminder) => reminder.dedupeKey === item.dedupeKey);
  if (existing) {
    if (existing.status === "pending" && existing.confirmationSentAt == null) {
      const existingCancellationToken = createCancellationToken(existing.id);
      const existingTokenHash = createHash("sha256").update(existingCancellationToken).digest("hex");
      const refreshed = { ...existing, cancellationTokenHash: existingTokenHash, updatedAt: now };
      await writeJson(items.map((entry) => entry.id === existing.id ? refreshed : entry));
      return { reminder: refreshed, created: false, cancellationToken: existingCancellationToken };
    }
    return { reminder: existing, created: false, cancellationToken: null };
  }
  items.push(item);
  await writeJson(items);
  return { reminder: item, created: true, cancellationToken };
};

export const markEventReminderConfirmationSent = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `UPDATE event_reminders
       SET confirmation_sent_at = COALESCE(confirmation_sent_at, $2), updated_at = $2
       WHERE id = $1`,
      [id, now]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.map((item) => item.id === id
    ? { ...item, confirmationSentAt: item.confirmationSentAt ?? now, updatedAt: now }
    : item));
};

const hashCancellationToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const getEventReminderCancellationState = async (
  token: string
): Promise<import("./types").EventReminderCancellationState> => {
  const tokenHash = hashCancellationToken(token);
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ status: EventReminderStatus }>(
      "SELECT status FROM event_reminders WHERE cancel_token_hash = $1 LIMIT 1",
      [tokenHash]
    );
    const status = result.rows[0]?.status;
    if (!status) return "not_found";
    if (status === "cancelled") return "cancelled";
    if (status === "sent" || status === "sending") return "sent";
    return "cancellable";
  }

  const reminder = (await readJson()).find((item) => item.cancellationTokenHash === tokenHash);
  if (!reminder) return "not_found";
  if (reminder.status === "cancelled") return "cancelled";
  if (reminder.status === "sent" || reminder.status === "sending") return "sent";
  return "cancellable";
};

export const cancelEventReminder = async (
  token: string
): Promise<import("./types").EventReminderCancellationState> => {
  const tokenHash = hashCancellationToken(token);
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ status: EventReminderStatus }>(
      `UPDATE event_reminders
       SET status = 'cancelled', cancelled_at = $2, updated_at = $2
       WHERE cancel_token_hash = $1 AND status IN ('pending', 'failed')
       RETURNING status`,
      [tokenHash, now]
    );
    if (result.rows[0]) return "cancelled";
    return getEventReminderCancellationState(token);
  }

  const items = await readJson();
  const reminder = items.find((item) => item.cancellationTokenHash === tokenHash);
  if (!reminder) return "not_found";
  if (reminder.status === "cancelled") return "cancelled";
  if (reminder.status === "sent" || reminder.status === "sending") return "sent";
  await writeJson(items.map((item) => item.id === reminder.id
    ? { ...item, status: "cancelled" as const, cancelledAt: now, updatedAt: now }
    : item));
  return "cancelled";
};

export const claimDueEventReminders = async (today: string, limit = 50): Promise<EventReminder[]> => {
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<EventReminderRow>(
      `WITH due AS (
         SELECT id FROM event_reminders
         WHERE remind_on <= $1
           AND attempt_count < 5
           AND (status = 'pending' OR (status = 'sending' AND (locked_at IS NULL OR locked_at < $3)))
         ORDER BY remind_on, created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE event_reminders AS reminder
       SET status = 'sending', locked_at = NOW(), attempt_count = reminder.attempt_count + 1, updated_at = NOW()
       FROM due
       WHERE reminder.id = due.id
       RETURNING reminder.*`,
      [today, limit, staleBefore]
    );
    return result.rows.map(mapRow);
  }

  const items = await readJson();
  const claimedIds = new Set(
    items
      .filter((item) => item.remindOn !== null && item.remindOn <= today && item.attemptCount < 5 && (
        item.status === "pending" || (item.status === "sending" && (item.lockedAt === null || item.lockedAt < staleBefore))
      ))
      .sort((a, b) => (a.remindOn ?? "").localeCompare(b.remindOn ?? "") || a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map((item) => item.id)
  );
  const now = new Date().toISOString();
  const updated = items.map((item) =>
    claimedIds.has(item.id)
      ? { ...item, status: "sending" as const, attemptCount: item.attemptCount + 1, lockedAt: now, updatedAt: now }
      : item
  );
  await writeJson(updated);
  return updated.filter((item) => claimedIds.has(item.id));
};

export const completeEventReminder = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "UPDATE event_reminders SET status = 'sent', sent_at = $2, locked_at = NULL, updated_at = $2 WHERE id = $1 AND status = 'sending'",
      [id, now]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.map((item) => item.id === id && item.status === "sending"
    ? { ...item, status: "sent" as const, sentAt: now, lockedAt: null, updatedAt: now }
    : item));
};

export const releaseEventReminder = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `UPDATE event_reminders
       SET status = CASE WHEN attempt_count >= 5 THEN 'failed' ELSE 'pending' END,
           locked_at = NULL,
           updated_at = $2
       WHERE id = $1 AND status = 'sending'`,
      [id, now]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.map((item) => item.id === id && item.status === "sending"
    ? { ...item, status: item.attemptCount >= 5 ? "failed" as const : "pending" as const, lockedAt: null, updatedAt: now }
    : item));
};
