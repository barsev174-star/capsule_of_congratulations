import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { CreateEventReminderInput, EventReminder, EventReminderStatus } from "./types";

const filePath = join(process.cwd(), "data", "event-reminders.json");

type EventReminderRow = {
  id: string;
  recipient_name: string;
  occasion_text: string;
  event_date: Date | string;
  remind_on: Date | string;
  email: string;
  source_card_id: string | null;
  dedupe_key: string;
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
  remindOn: toDateOnly(row.remind_on),
  email: row.email,
  sourceCardId: row.source_card_id,
  dedupeKey: row.dedupe_key,
  status: row.status,
  sentAt: toIso(row.sent_at),
  cancelledAt: toIso(row.cancelled_at),
  createdAt: toIso(row.created_at) ?? "",
  updatedAt: toIso(row.updated_at) ?? ""
});

const readJson = async (): Promise<EventReminder[]> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as EventReminder[];
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
): Promise<{ reminder: EventReminder; created: boolean }> => {
  const now = new Date().toISOString();
  const item: EventReminder = {
    id: randomUUID(),
    ...input,
    status: "pending",
    sentAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<EventReminderRow>(
      `INSERT INTO event_reminders
        (id, recipient_name, occasion_text, event_date, remind_on, email, source_card_id, dedupe_key,
         status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING *`,
      [
        item.id,
        item.recipientName,
        item.occasionText,
        item.eventDate,
        item.remindOn,
        item.email,
        item.sourceCardId,
        item.dedupeKey,
        item.status,
        now,
        now
      ]
    );

    if (result.rows[0]) {
      return { reminder: mapRow(result.rows[0]), created: true };
    }

    const existing = await getPostgresPool().query<EventReminderRow>(
      "SELECT * FROM event_reminders WHERE dedupe_key = $1 LIMIT 1",
      [item.dedupeKey]
    );
    return { reminder: mapRow(existing.rows[0]), created: false };
  }

  const items = await readJson();
  const existing = items.find((reminder) => reminder.dedupeKey === item.dedupeKey);
  if (existing) return { reminder: existing, created: false };
  items.push(item);
  await writeJson(items);
  return { reminder: item, created: true };
};

export const claimDueEventReminders = async (today: string, limit = 50): Promise<EventReminder[]> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<EventReminderRow>(
      `WITH due AS (
         SELECT id FROM event_reminders
         WHERE status = 'pending' AND remind_on <= $1
         ORDER BY remind_on, created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE event_reminders AS reminder
       SET status = 'sending', updated_at = NOW()
       FROM due
       WHERE reminder.id = due.id
       RETURNING reminder.*`,
      [today, limit]
    );
    return result.rows.map(mapRow);
  }

  const items = await readJson();
  const claimedIds = new Set(
    items
      .filter((item) => item.status === "pending" && item.remindOn <= today)
      .sort((a, b) => a.remindOn.localeCompare(b.remindOn) || a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map((item) => item.id)
  );
  const now = new Date().toISOString();
  const updated = items.map((item) =>
    claimedIds.has(item.id) ? { ...item, status: "sending" as const, updatedAt: now } : item
  );
  await writeJson(updated);
  return updated.filter((item) => claimedIds.has(item.id));
};

export const completeEventReminder = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "UPDATE event_reminders SET status = 'sent', sent_at = $2, updated_at = $2 WHERE id = $1 AND status = 'sending'",
      [id, now]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.map((item) => item.id === id && item.status === "sending"
    ? { ...item, status: "sent" as const, sentAt: now, updatedAt: now }
    : item));
};

export const releaseEventReminder = async (id: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "UPDATE event_reminders SET status = 'pending', updated_at = $2 WHERE id = $1 AND status = 'sending'",
      [id, now]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.map((item) => item.id === id && item.status === "sending"
    ? { ...item, status: "pending" as const, updatedAt: now }
    : item));
};
