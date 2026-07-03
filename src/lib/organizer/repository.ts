import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";

type MagicLinkRecord = {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

const filePath = join(process.cwd(), "data", "organizer-magic-links.json");

const readJson = async (): Promise<MagicLinkRecord[]> => {
  try { return JSON.parse(await readFile(filePath, "utf8")) as MagicLinkRecord[]; }
  catch { return []; }
};

const writeJson = async (items: MagicLinkRecord[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
};

export const countRecentMagicLinks = async (email: string, since: Date) => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM organizer_magic_links WHERE email = $1 AND created_at >= $2",
      [email, since]
    );
    return Number(result.rows[0]?.count ?? 0);
  }
  const sinceMs = since.getTime();
  return (await readJson()).filter(
    (item) => item.email === email && new Date(item.createdAt).getTime() >= sinceMs
  ).length;
};

export const storeMagicLink = async (email: string, tokenHash: string, expiresAt: Date) => {
  const item: MagicLinkRecord = {
    id: randomUUID(),
    email,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: new Date().toISOString()
  };
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `INSERT INTO organizer_magic_links (id, email, token_hash, expires_at, used_at, created_at)
       VALUES ($1, $2, $3, $4, NULL, $5)`,
      [item.id, email, tokenHash, item.expiresAt, item.createdAt]
    );
    return;
  }
  const items = await readJson();
  items.push(item);
  await writeJson(items.slice(-500));
};

export const consumeMagicLink = async (tokenHash: string): Promise<string | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ email: string }>(
      `UPDATE organizer_magic_links SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING email`,
      [tokenHash]
    );
    return result.rows[0]?.email ?? null;
  }
  const items = await readJson();
  const index = items.findIndex(
    (item) => item.tokenHash === tokenHash && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now()
  );
  if (index < 0) return null;
  items[index] = { ...items[index], usedAt: new Date().toISOString() };
  await writeJson(items);
  return items[index].email;
};
