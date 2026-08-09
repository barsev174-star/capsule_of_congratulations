import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type {
  CreateSupportRequestInput,
  SupportNotificationChannel,
  SupportRequest,
  SupportRequestStatus
} from "./types";
import { appendSupportNotificationDeliveries } from "./notifications-repository";

const filePath = join(process.cwd(), "data", "support-requests.json");

type SupportRequestRow = {
  id: string;
  category: SupportRequest["category"];
  contact_name: string | null;
  email: string;
  message: string;
  source: string;
  status: SupportRequestStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);
const mapRow = (row: SupportRequestRow): SupportRequest => ({
  id: row.id,
  category: row.category,
  contactName: row.contact_name,
  email: row.email,
  message: row.message,
  source: row.source,
  status: row.status,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const readJson = async (): Promise<SupportRequest[]> => {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as SupportRequest[];
  } catch {
    return [];
  }
};

const writeJson = async (items: SupportRequest[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
};

export const countRecentSupportRequests = async (email: string, since: Date): Promise<number> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM support_requests WHERE email = $1 AND created_at >= $2",
      [email, since]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  const sinceMs = since.getTime();
  return (await readJson()).filter(
    (item) => item.email === email && new Date(item.createdAt).getTime() >= sinceMs
  ).length;
};

export const createSupportRequest = async (
  input: CreateSupportRequestInput,
  notificationChannels: SupportNotificationChannel[] = ["email"]
): Promise<SupportRequest> => {
  const now = new Date().toISOString();
  const item: SupportRequest = {
    id: randomUUID(),
    ...input,
    status: "new",
    createdAt: now,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    const client = await getPostgresPool().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<SupportRequestRow>(
        `INSERT INTO support_requests
          (id, category, contact_name, email, message, source, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [item.id, item.category, item.contactName, item.email, item.message, item.source, item.status, now, now]
      );
      for (const channel of [...new Set(notificationChannels)]) {
        await client.query(
          `INSERT INTO support_notification_deliveries
            (id, support_request_id, channel, status, attempt_count, next_attempt_at, created_at, updated_at)
           VALUES ($1, $2, $3, 'pending', 0, $4, $4, $4)`,
          [randomUUID(), item.id, channel, now]
        );
      }
      await client.query("COMMIT");
      return mapRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const items = await readJson();
  items.push(item);
  await writeJson(items);
  await appendSupportNotificationDeliveries(item.id, notificationChannels, now);
  return item;
};

export const listSupportRequests = async (status?: SupportRequestStatus): Promise<SupportRequest[]> => {
  if (isPostgresConfigured()) {
    const params = status ? [status] : [];
    const where = status ? "WHERE status = $1" : "";
    const result = await getPostgresPool().query<SupportRequestRow>(
      `SELECT * FROM support_requests ${where} ORDER BY created_at DESC LIMIT 100`,
      params
    );
    return result.rows.map(mapRow);
  }

  return (await readJson())
    .filter((item) => !status || item.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
};

export const updateSupportRequestStatus = async (
  id: string,
  status: SupportRequestStatus
): Promise<SupportRequest | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<SupportRequestRow>(
      "UPDATE support_requests SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [id, status]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  const items = await readJson();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], status, updatedAt: new Date().toISOString() };
  await writeJson(items);
  return items[index];
};
