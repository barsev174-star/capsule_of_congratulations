import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type {
  AiCardInsight,
  AiCardInsightType,
  AiGenerationInput,
  AiGenerationLog,
  AiGenerationType,
  AiProviderName,
  AiUsageSummary,
  AiUsageReservation,
  AiVariant
} from "@/lib/ai/types";

export type AiGenerationRequestState =
  | { status: "pending" }
  | { status: "succeeded"; variants: AiVariant[] };

const aiLogFilePath = join(process.cwd(), "data", "ai-generations.json");
const paymentOrdersFilePath = join(process.cwd(), "data", "payment-orders.json");
const aiInsightsFilePath = join(process.cwd(), "data", "ai-card-insights.json");
const aiAllowancesFilePath = join(process.cwd(), "data", "ai-card-allowances.json");

const ensureJsonFile = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
};

const readJsonArray = async <T>(filePath: string): Promise<T[]> => {
  await ensureJsonFile(filePath);

  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const readAiLogs = async (): Promise<AiGenerationLog[]> => {
  const entries = await readJsonArray<AiGenerationLog>(aiLogFilePath);

  return entries.map((entry) => ({
    ...entry,
    generationType: entry.generationType ?? "participant_message",
    status: entry.status ?? "succeeded"
  }));
};

const writeAiLogs = (entries: AiGenerationLog[]) =>
  writeFile(aiLogFilePath, JSON.stringify(entries, null, 2), "utf8");

export const hasPaidAiEntitlement = async (cardId: string) => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ paid: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM cards c
         LEFT JOIN payment_orders po ON po.id = c.active_paid_order_id
         LEFT JOIN card_access_grants access_grant ON access_grant.id = c.active_access_grant_id
         WHERE c.id = $1
           AND ((c.payment_status = 'PAID'
             AND po.status = 'PAID'
             AND po.total_refunded_amount < po.payable_amount
             AND po.revoked_at IS NULL)
             OR (access_grant.status = 'ACTIVE' AND (access_grant.expires_at IS NULL OR access_grant.expires_at > now())))
       ) AS paid`,
      [cardId]
    );

    return result.rows[0]?.paid ?? false;
  }

  const orders = await readJsonArray<{ cardId: string; status: string }>(paymentOrdersFilePath);
  return orders.some((order) => order.cardId === cardId && order.status === "paid");
};

export const reserveAiGeneration = async (input: {
  id: string;
  cardId: string;
  limit: number;
  generationType?: AiGenerationType;
}): Promise<AiUsageReservation | null> => {
  const generationType = input.generationType ?? "participant_message";
  if (isPostgresConfigured()) {
    const client = await getPostgresPool().connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM cards WHERE id = $1 FOR UPDATE", [input.cardId]);
      await client.query("DELETE FROM ai_generation_drafts WHERE created_at < now() - interval '30 days'");
      const countResult = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM ai_usage_events
         WHERE card_id = $1`,
        [input.cardId]
      );
      const usedBefore = Number(countResult.rows[0]?.count ?? 0);

      if (usedBefore >= input.limit) {
        await client.query("ROLLBACK");
        return null;
      }

      const insertResult = await client.query(
        `INSERT INTO ai_usage_events (id, card_id, generation_type, status, created_at)
         VALUES ($1, $2, $3, 'pending', now())
         ON CONFLICT (id) DO NOTHING
         RETURNING id`,
        [input.id, input.cardId, generationType]
      );
      if (insertResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query("COMMIT");

      return {
        id: input.id,
        usage: {
          used: usedBefore + 1,
          limit: input.limit,
          remaining: input.limit - usedBefore - 1
        }
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const entries = await readAiLogs();
  if (entries.some((entry) => entry.id === input.id)) return null;
  const usedBefore = entries.filter(
    (entry) => entry.cardId === input.cardId
  ).length;

  if (usedBefore >= input.limit) {
    return null;
  }

  entries.push({
    id: input.id,
    cardId: input.cardId,
    generationType,
    status: "pending",
    createdAt: new Date().toISOString()
  });
  await writeAiLogs(entries);

  return {
    id: input.id,
    usage: {
      used: usedBefore + 1,
      limit: input.limit,
      remaining: input.limit - usedBefore - 1
    }
  };
};

export const getAiGenerationRequestState = async (
  id: string,
  cardId: string
): Promise<AiGenerationRequestState | null> => {
  if (!id) return null;

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ status: "pending" | "succeeded"; output: unknown }>(
      `SELECT usage.status, draft.output
       FROM ai_usage_events usage
       LEFT JOIN ai_generation_drafts draft ON draft.id = usage.id AND draft.card_id = usage.card_id
       WHERE usage.id = $1 AND usage.card_id = $2`,
      [id, cardId]
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.status !== "succeeded") return { status: "pending" };
    return Array.isArray(row.output) ? { status: "succeeded", variants: row.output as AiVariant[] } : { status: "pending" };
  }

  const entry = (await readAiLogs()).find((item) => item.id === id && item.cardId === cardId);
  if (!entry) return null;
  if (entry.status !== "succeeded") return { status: "pending" };
  try {
    const variants = entry.outputText ? JSON.parse(entry.outputText) : null;
    return Array.isArray(variants) ? { status: "succeeded", variants: variants as AiVariant[] } : { status: "pending" };
  } catch {
    return { status: "pending" };
  }
};

export const completeAiGeneration = async (input: {
  id: string;
  cardId: string;
  generationInput: AiGenerationInput;
  variants: AiVariant[];
  provider: AiProviderName;
  model: string;
}) => {
  const { existingMessages: _existingMessages, ...storedGenerationInput } = input.generationInput;

  if (isPostgresConfigured()) {
    const client = await getPostgresPool().connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE ai_usage_events
         SET status = 'succeeded', provider = $2, model = $3, completed_at = now()
         WHERE id = $1`,
        [input.id, input.provider, input.model]
      );
      await client.query(
        `INSERT INTO ai_generation_drafts (id, card_id, input, output, created_at)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, now())`,
        [input.id, input.cardId, JSON.stringify(storedGenerationInput), JSON.stringify(input.variants)]
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

  const entries = await readAiLogs();
  const index = entries.findIndex((entry) => entry.id === input.id && entry.cardId === input.cardId);

  if (index >= 0) {
    entries[index] = {
      ...entries[index],
      status: "succeeded",
      provider: input.provider,
      model: input.model,
      inputJson: JSON.stringify(storedGenerationInput),
      outputText: JSON.stringify(input.variants),
      completedAt: new Date().toISOString()
    };
    await writeAiLogs(entries);
  }
};

export const releaseAiGeneration = async (id: string) => {
  if (isPostgresConfigured()) {
    await getPostgresPool().query("DELETE FROM ai_usage_events WHERE id = $1 AND status = 'pending'", [id]);
    return;
  }

  const entries = await readAiLogs();
  await writeAiLogs(entries.filter((entry) => !(entry.id === id && entry.status === "pending")));
};

export const consumeAiGenerationDraft = async (cardId: string, generationId: string) => {
  if (!generationId) return;

  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      "DELETE FROM ai_generation_drafts WHERE id = $1 AND card_id = $2",
      [generationId, cardId]
    );
    return;
  }

  const entries = await readAiLogs();
  const updated = entries.map((entry) =>
    entry.id === generationId && entry.cardId === cardId
      ? { ...entry, inputJson: undefined, outputText: undefined }
      : entry
  );
  await writeAiLogs(updated);
};

export const consumeAiGenerationDrafts = async (cardId: string, generationIds: string[]) => {
  const uniqueIds = [...new Set(generationIds)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 20);
  await Promise.all(uniqueIds.map((generationId) => consumeAiGenerationDraft(cardId, generationId)));
};

export const countAiGenerationsByCardId = async (cardId: string) => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM ai_usage_events
       WHERE card_id = $1`,
      [cardId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  const entries = await readAiLogs();
  return entries.filter((entry) => entry.cardId === cardId).length;
};

export const completeAiUsageEvent = async (input: {
  id: string;
  provider: AiProviderName;
  model: string;
}) => {
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `UPDATE ai_usage_events
       SET status = 'succeeded', provider = $2, model = $3, completed_at = now()
       WHERE id = $1`,
      [input.id, input.provider, input.model]
    );
    return;
  }

  const entries = await readAiLogs();
  const index = entries.findIndex((entry) => entry.id === input.id);
  if (index === -1) return;

  entries[index] = {
    ...entries[index],
    status: "succeeded",
    provider: input.provider,
    model: input.model,
    completedAt: new Date().toISOString()
  };
  await writeAiLogs(entries);
};

export const getAiCardInsight = async (cardId: string, type: AiCardInsightType): Promise<AiCardInsight | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{
      card_id: string;
      insight_type: AiCardInsightType;
      items: AiCardInsight["items"];
      source_fingerprint: string;
      provider: AiProviderName;
      model: string;
      updated_at: Date | string;
    }>(
      `SELECT card_id, insight_type, items, source_fingerprint, provider, model, updated_at
       FROM ai_card_insights WHERE card_id = $1 AND insight_type = $2`,
      [cardId, type]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      cardId: row.card_id,
      type: row.insight_type,
      items: row.items,
      sourceFingerprint: row.source_fingerprint,
      provider: row.provider,
      model: row.model,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
  }

  const entries = await readJsonArray<AiCardInsight>(aiInsightsFilePath);
  return entries.find((entry) => entry.cardId === cardId && entry.type === type) ?? null;
};

export const saveAiCardInsight = async (insight: AiCardInsight) => {
  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `INSERT INTO ai_card_insights
         (card_id, insight_type, items, source_fingerprint, provider, model, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, now())
       ON CONFLICT (card_id, insight_type) DO UPDATE SET
         items = EXCLUDED.items,
         source_fingerprint = EXCLUDED.source_fingerprint,
         provider = EXCLUDED.provider,
         model = EXCLUDED.model,
         updated_at = now()`,
      [
        insight.cardId,
        insight.type,
        JSON.stringify(insight.items),
        insight.sourceFingerprint,
        insight.provider,
        insight.model
      ]
    );
    return;
  }

  const entries = await readJsonArray<AiCardInsight>(aiInsightsFilePath);
  const next = entries.filter((entry) => !(entry.cardId === insight.cardId && entry.type === insight.type));
  next.push(insight);
  await ensureJsonFile(aiInsightsFilePath);
  await writeFile(aiInsightsFilePath, JSON.stringify(next, null, 2), "utf8");
};

export const getAiBonusLimit = async (cardId: string) => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<{ bonus_limit: number }>(
      "SELECT bonus_limit FROM ai_card_allowances WHERE card_id = $1",
      [cardId]
    );
    return result.rows[0]?.bonus_limit ?? 0;
  }

  const entries = await readJsonArray<{ cardId: string; bonusLimit: number }>(aiAllowancesFilePath);
  return entries.find((entry) => entry.cardId === cardId)?.bonusLimit ?? 0;
};

export const setAiBonusLimit = async (cardId: string, bonusLimit: number) => {
  const normalized = Math.max(0, Math.min(1000, Math.floor(bonusLimit)));

  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `INSERT INTO ai_card_allowances (card_id, bonus_limit, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (card_id) DO UPDATE SET bonus_limit = EXCLUDED.bonus_limit, updated_at = now()`,
      [cardId, normalized]
    );
    return normalized;
  }

  const entries = await readJsonArray<{ cardId: string; bonusLimit: number }>(aiAllowancesFilePath);
  const next = entries.filter((entry) => entry.cardId !== cardId);
  next.push({ cardId, bonusLimit: normalized });
  await ensureJsonFile(aiAllowancesFilePath);
  await writeFile(aiAllowancesFilePath, JSON.stringify(next, null, 2), "utf8");
  return normalized;
};

export const getAiUsageSummary = async (cardId: string): Promise<AiUsageSummary> => {
  const [used, isPaid, bonusLimit] = await Promise.all([
    countAiGenerationsByCardId(cardId),
    hasPaidAiEntitlement(cardId),
    getAiBonusLimit(cardId)
  ]);
  const freeLimit = Number(process.env.AI_FREE_LIMIT ?? 5);
  const paidLimit = Number(process.env.AI_PAID_LIMIT ?? 30);
  const baseLimit = isPaid ? paidLimit : freeLimit;
  const limit = baseLimit + bonusLimit;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    baseLimit,
    bonusLimit,
    isPaid
  };
};
