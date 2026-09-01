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
  returnPath: string | null;
  claimCardId: string | null;
  transferCardId: string | null;
};

export type PendingOrganizerEmailChange = Pick<MagicLinkRecord, "email" | "createdAt" | "expiresAt">;

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

export const storeMagicLink = async (
  email: string,
  tokenHash: string,
  expiresAt: Date,
  context: { returnPath?: string; claimCardId?: string; transferCardId?: string } = {}
) => {
  const item: MagicLinkRecord = {
    id: randomUUID(),
    email,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    usedAt: null,
    createdAt: new Date().toISOString(),
    returnPath: context.returnPath ?? null,
    claimCardId: context.claimCardId ?? null,
    transferCardId: context.transferCardId ?? null
  };
  if (isPostgresConfigured()) {
    const values = [item.id, email, tokenHash, item.expiresAt, item.createdAt, item.returnPath, item.claimCardId, item.transferCardId];
    if (!item.transferCardId) {
      await getPostgresPool().query(
        `INSERT INTO organizer_magic_links (
           id, email, token_hash, expires_at, used_at, created_at, return_path, claim_card_id, transfer_card_id
         ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)`,
        values
      );
      return;
    }
    const client = await getPostgresPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [`organizer-transfer:${item.transferCardId}`]);
      await client.query(
        "DELETE FROM organizer_magic_links WHERE transfer_card_id = $1 AND used_at IS NULL",
        [item.transferCardId]
      );
      await client.query(
        `INSERT INTO organizer_magic_links (
           id, email, token_hash, expires_at, used_at, created_at, return_path, claim_card_id, transfer_card_id
         ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)`,
        values
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }
  const items = (await readJson()).filter(
    (existing) => !item.transferCardId || existing.transferCardId !== item.transferCardId || Boolean(existing.usedAt)
  );
  items.push(item);
  await writeJson(items.slice(-500));
};

export const getPendingOrganizerEmailChange = async (
  cardId: string
): Promise<PendingOrganizerEmailChange | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{
      email: string;
      createdAt: Date | string;
      expiresAt: Date | string;
    }>(
      `SELECT email, created_at AS "createdAt", expires_at AS "expiresAt"
       FROM organizer_magic_links
       WHERE transfer_card_id = $1 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [cardId]
    );
    const row = result.rows[0];
    return row
      ? {
          email: row.email,
          createdAt: new Date(row.createdAt).toISOString(),
          expiresAt: new Date(row.expiresAt).toISOString()
        }
      : null;
  }
  const now = Date.now();
  const item = (await readJson())
    .filter(
      (record) =>
        record.transferCardId === cardId &&
        !record.usedAt &&
        new Date(record.expiresAt).getTime() > now
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  return item ? { email: item.email, createdAt: item.createdAt, expiresAt: item.expiresAt } : null;
};

export const revokePendingOrganizerEmailChanges = async (cardId: string) => {
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "DELETE FROM organizer_magic_links WHERE transfer_card_id = $1 AND used_at IS NULL",
      [cardId]
    );
    return;
  }
  await writeJson((await readJson()).filter(
    (item) => item.transferCardId !== cardId || Boolean(item.usedAt)
  ));
};

export const deleteUnusedMagicLink = async (tokenHash: string) => {
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "DELETE FROM organizer_magic_links WHERE token_hash = $1 AND used_at IS NULL",
      [tokenHash]
    );
    return;
  }
  const items = await readJson();
  await writeJson(items.filter((item) => item.tokenHash !== tokenHash || item.usedAt));
};

export const consumeMagicLink = async (tokenHash: string): Promise<{
  email: string;
  returnPath: string | null;
  claimCardId: string | null;
  transferCardId: string | null;
} | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{
      email: string;
      returnPath: string | null;
      claimCardId: string | null;
      transferCardId: string | null;
    }>(
      `UPDATE organizer_magic_links SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING email, return_path AS "returnPath", claim_card_id AS "claimCardId", transfer_card_id AS "transferCardId"`,
      [tokenHash]
    );
    return result.rows[0] ?? null;
  }
  const items = await readJson();
  const index = items.findIndex(
    (item) => item.tokenHash === tokenHash && !item.usedAt && new Date(item.expiresAt).getTime() > Date.now()
  );
  if (index < 0) return null;
  items[index] = { ...items[index], usedAt: new Date().toISOString() };
  await writeJson(items);
  return {
    email: items[index].email,
    returnPath: items[index].returnPath ?? null,
    claimCardId: items[index].claimCardId ?? null,
    transferCardId: items[index].transferCardId ?? null
  };
};
