import { randomUUID, createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";

export async function recordAdminAction(input: { email: string; action: string; objectType: string; objectId: string; result?: "succeeded" | "failed" }, client?: PoolClient) {
  // Stable identity without copying email or credentials to the event log.
  const fallbackId = `env:${createHash("sha256").update(input.email.toLowerCase()).digest("hex")}`;
  if (isPostgresConfigured()) {
    const db = client ?? getPostgresPool();
    await db.query(`INSERT INTO admin_action_events(id,actor_id,action,object_type,object_id,result)
      VALUES($1,COALESCE((SELECT id::text FROM admin_users WHERE email = $2),$3),$4,$5,$6,$7)`, [randomUUID(), input.email.toLowerCase(), fallbackId, input.action, input.objectType, input.objectId, input.result ?? "succeeded"]);
  } else {
    await mkdir(join(process.cwd(), "logs"), { recursive: true });
    await appendFile(join(process.cwd(), "logs", "admin-actions.jsonl"), `${JSON.stringify({ id: randomUUID(), actorId: fallbackId, action: input.action, objectType: input.objectType, objectId: input.objectId, result: input.result ?? "succeeded", createdAt: new Date().toISOString() })}\n`);
  }
}

export async function setCardTestFlag(cardId: string, isTest: boolean, email: string) {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE cards SET is_test = $2 WHERE id = $1 AND purged_at IS NULL AND is_test IS DISTINCT FROM $2 RETURNING id", [cardId, isTest]);
    if (result.rowCount) {
      await recordAdminAction({ email, action: isTest ? "card.mark_test" : "card.mark_real", objectType: "card", objectId: cardId }, client);
      await client.query("INSERT INTO card_audit_events(id,card_id,actor_type,actor_id,event_type) VALUES($1,$2,'admin',$3,$4)", [randomUUID(), cardId, createHash("sha256").update(email.toLowerCase()).digest("hex"), isTest ? "test_marked" : "test_unmarked"]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function getAdminCardAuditHistory(cardId: string): Promise<{ id: string; type: string; date: string }[]> {
  if (!isPostgresConfigured()) return [];
  return (await getPostgresPool().query<{ id: string; type: string; date: string }>("SELECT id,event_type AS type,created_at::text AS date FROM card_audit_events WHERE card_id=$1 ORDER BY created_at DESC,id LIMIT 30", [cardId])).rows;
}
