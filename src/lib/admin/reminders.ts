import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { EventReminder } from "@/lib/reminders/types";
import { serializeDateOnly } from "@/lib/dates/date-only";
import { recordAdminAction } from "./audit";

export type AdminReminder = Omit<EventReminder, "dedupeKey" | "cancellationTokenHash">;
const fields = `id, recipient_name AS "recipientName", occasion_text AS "occasionText", event_date AS "eventDate", remind_on AS "remindOn", schedule, email, source_card_id AS "sourceCardId", consent_version AS "consentVersion", consent_accepted_at AS "consentAcceptedAt", confirmation_sent_at AS "confirmationSentAt", attempt_count AS "attemptCount", locked_at AS "lockedAt", status, sent_at AS "sentAt", cancelled_at AS "cancelledAt", created_at AS "createdAt", updated_at AS "updatedAt"`;
const normalize = (row: AdminReminder): AdminReminder => ({ ...row, eventDate: serializeDateOnly(row.eventDate), remindOn: row.remindOn ? serializeDateOnly(row.remindOn) : null, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString() });
export type ReminderFilters = { status?: string; search?: string; from?: string; to?: string; eventDate?: string; occasion?: string; limit?: number; offset?: number };
export async function listAdminReminders(filters: ReminderFilters = {}): Promise<AdminReminder[]> {
  const { status, search, from, to, eventDate, occasion, limit = 21, offset = 0 } = filters;
  if (!isPostgresConfigured()) {
    let rows: EventReminder[] = [];
    try { rows = JSON.parse(await readFile(join(process.cwd(), "data", "event-reminders.json"), "utf8")); } catch { /* no local requests */ }
    return rows.filter((r) => (!status || (status === "pending" ? r.status === "pending" && r.remindOn !== null : r.status === status)) && (!search || r.email.toLowerCase().includes(search.toLowerCase())) && (!from || Date.parse(r.createdAt) >= Date.parse(`${from}T00:00:00+05:00`)) && (!to || Date.parse(r.createdAt) < Date.parse(`${to}T00:00:00+05:00`) + 86400000) && (!eventDate || r.eventDate === eventDate) && (!occasion || r.occasionText.toLowerCase().includes(occasion.toLowerCase()))).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(offset, offset + limit).map((row) => {
      const { dedupeKey: _dedupe, cancellationTokenHash: _token, ...safe } = row;
      return safe;
    });
  }
  const conditions: string[] = [], values: (string | number)[] = [];
  const add = (sql: string, value: string | number) => { values.push(value); conditions.push(sql.replace("?", `$${values.length}`)); };
  if (status) { add("status = ?", status); if (status === "pending") conditions.push("remind_on IS NOT NULL"); }
  if (search) add("email ILIKE ?", `%${search}%`);
  if (occasion) add("occasion_text ILIKE ?", `%${occasion}%`);
  if (eventDate) add("event_date = ?::date", eventDate);
  if (from) add("created_at >= (?::date::timestamp AT TIME ZONE 'Asia/Yekaterinburg')", from);
  if (to) add("created_at < ((?::date + 1)::timestamp AT TIME ZONE 'Asia/Yekaterinburg')", to);
  values.push(limit, offset);
  const result = await getPostgresPool().query<AdminReminder>(`SELECT ${fields} FROM event_reminders ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC, id LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return result.rows.map(normalize);
}
export async function getAdminReminder(id: string): Promise<AdminReminder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (!isPostgresConfigured()) {
    const rows = await listAdminReminders({ limit: Number.MAX_SAFE_INTEGER });
    return rows.find((row) => row.id === id) ?? null;
  }
  const result = await getPostgresPool().query<AdminReminder>(`SELECT ${fields} FROM event_reminders WHERE id = $1`, [id]);
  return result.rows[0] ? normalize(result.rows[0]) : null;
}
export async function getReminderErrorHistory(id: string): Promise<{ id: string; date: string; errorId: string | null }[]> {
  if (!isPostgresConfigured()) return [];
  const result = await getPostgresPool().query<{ id: string; date: string; errorId: string | null }>(`SELECT id, created_at::text AS date, error_id AS "errorId" FROM telemetry_events WHERE kind = 'critical' AND context->>'reminderId' = $1 AND context->>'operation' = 'event_reminder' ORDER BY created_at DESC LIMIT 20`, [id]);
  return result.rows;
}
export async function cancelAdminReminder(id: string, email: string): Promise<void> {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE event_reminders SET status = 'cancelled', cancelled_at = now(), updated_at = now(), locked_at = NULL WHERE id = $1 AND status IN ('pending','failed') AND remind_on IS NOT NULL RETURNING id", [id]);
    if (result.rowCount) await recordAdminAction({ email, action: "reminder.cancel", objectType: "reminder", objectId: id }, client);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function getAdminReminderAnalytics(days: number | null): Promise<{ requests: number; scheduled: number; sent: number; pending: number; failed: number } | null> {
  if (!isPostgresConfigured()) return null;
  const result = await getPostgresPool().query<{ requests: number; scheduled: number; sent: number; pending: number; failed: number }>(`SELECT count(*)::int AS requests, count(*) FILTER(WHERE remind_on IS NOT NULL)::int AS scheduled, count(*) FILTER(WHERE sent_at IS NOT NULL)::int AS sent, count(*) FILTER(WHERE status IN ('pending','sending') AND remind_on IS NOT NULL)::int AS pending, count(*) FILTER(WHERE status='failed')::int AS failed FROM event_reminders r WHERE ($1::int IS NULL OR created_at >= now() - ($1 * interval '1 day')) AND created_at <= now() AND NOT EXISTS(SELECT 1 FROM cards c WHERE c.id = r.source_card_id AND c.is_test)`, [days]);
  return result.rows[0];
}
