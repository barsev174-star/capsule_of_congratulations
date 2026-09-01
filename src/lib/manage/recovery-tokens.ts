import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";

type RecoveryTokenRecord = {
  id: string;
  cardId: string;
  tokenHash: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const filePath = join(process.cwd(), "data", "card-recovery-tokens.json");
const hashToken = (token: string) => createHash("sha256").update(token.trim()).digest("hex");

const readJson = async (): Promise<RecoveryTokenRecord[]> => {
  try { return JSON.parse(await readFile(filePath, "utf8")) as RecoveryTokenRecord[]; }
  catch { return []; }
};

const writeJson = async (records: RecoveryTokenRecord[]) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
};

export const hasActiveCardRecoveryToken = async (cardId: string) => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ active: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM card_recovery_tokens WHERE card_id = $1 AND revoked_at IS NULL
       ) AS active`,
      [cardId]
    );
    return Boolean(result.rows[0]?.active);
  }
  return (await readJson()).some((item) => item.cardId === cardId && !item.revokedAt);
};

export const storeCardRecoveryToken = async (cardId: string, rawToken: string) => {
  const record: RecoveryTokenRecord = {
    id: randomUUID(),
    cardId,
    tokenHash: hashToken(rawToken),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null
  };
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `INSERT INTO card_recovery_tokens (id, card_id, token_hash, created_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT (token_hash) DO NOTHING`,
      [record.id, record.cardId, record.tokenHash, record.createdAt]
    );
    return;
  }
  const records = await readJson();
  if (!records.some((item) => item.tokenHash === record.tokenHash)) records.push(record);
  await writeJson(records);
};

export const resolveCardRecoveryToken = async (rawToken: string): Promise<string | null> => {
  const tokenHash = hashToken(rawToken);
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ cardId: string }>(
      `UPDATE card_recovery_tokens SET last_used_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL
       RETURNING card_id AS "cardId"`,
      [tokenHash]
    );
    return result.rows[0]?.cardId ?? null;
  }
  const records = await readJson();
  const index = records.findIndex((item) => item.tokenHash === tokenHash && !item.revokedAt);
  if (index < 0) return null;
  records[index] = { ...records[index], lastUsedAt: new Date().toISOString() };
  await writeJson(records);
  return records[index].cardId;
};

export const rotateCardRecoveryToken = async (cardId: string) => {
  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    const client = await getPostgresPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE card_recovery_tokens SET revoked_at = now() WHERE card_id = $1 AND revoked_at IS NULL", [cardId]);
      await client.query("UPDATE cards SET manage_token = NULL, updated_at = now() WHERE id = $1", [cardId]);
      await client.query(
        "INSERT INTO card_recovery_tokens (id, card_id, token_hash, created_at) VALUES ($1, $2, $3, $4)",
        [randomUUID(), cardId, hashToken(rawToken), now]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return rawToken;
  }
  const records = (await readJson()).map((item) =>
    item.cardId === cardId && !item.revokedAt ? { ...item, revokedAt: now } : item
  );
  records.push({ id: randomUUID(), cardId, tokenHash: hashToken(rawToken), createdAt: now, lastUsedAt: null, revokedAt: null });
  await writeJson(records);
  return rawToken;
};

export const revokeCardRecoveryTokens = async (cardId: string) => {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await getPostgresPool().query("UPDATE card_recovery_tokens SET revoked_at = now() WHERE card_id = $1 AND revoked_at IS NULL", [cardId]);
    await getPostgresPool().query("UPDATE cards SET manage_token = NULL, updated_at = now() WHERE id = $1", [cardId]);
    return;
  }
  await writeJson((await readJson()).map((item) =>
    item.cardId === cardId && !item.revokedAt ? { ...item, revokedAt: now } : item
  ));
};
