import { randomUUID } from "node:crypto";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { ClosedParticipantGiftPollState, GiftPoll, GiftPollOption, GiftPollWithOptions, ParticipantGiftPoll } from "./types";

export type GiftPollOptionWrite = Pick<GiftPollOption, "id" | "title" | "description" | "imageUrl" | "priceLabel" | "productUrl" | "sortOrder">;
export type GiftPollMutationResult = "ok" | "locked" | "stale" | "missing";

type PollRow = {
  id: string; card_id: string; mode: GiftPoll["mode"]; title: string; question: string;
  status: GiftPoll["status"]; closes_at: Date | string | null; closed_at: Date | string | null; selected_option_id: string | null;
  created_at: Date | string; updated_at: Date | string;
};
type OptionRow = {
  id: string; poll_id: string; title: string; description: string | null; image_url: string | null;
  price_label: string | null; product_url: string | null; sort_order: number; deleted_at: Date | string | null;
  created_at: Date | string; updated_at: Date | string;
};
const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : value;
const mapPoll = (row: PollRow): GiftPoll => ({
  id: row.id, cardId: row.card_id, mode: row.mode, title: row.title, question: row.question, status: row.status,
  closesAt: row.closes_at ? iso(row.closes_at) : null, closedAt: row.closed_at ? iso(row.closed_at) : null, selectedOptionId: row.selected_option_id,
  createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});
const mapOption = (row: OptionRow): GiftPollOption => ({
  id: row.id, pollId: row.poll_id, title: row.title, description: row.description, imageUrl: row.image_url,
  priceLabel: row.price_label, productUrl: row.product_url, sortOrder: row.sort_order,
  deletedAt: row.deleted_at ? iso(row.deleted_at) : null, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});

const unavailable = () => { throw new Error("Gift polls require PostgreSQL."); };

export const getGiftPollForManage = async (cardId: string): Promise<GiftPollWithOptions | null> => {
  if (!isPostgresConfigured()) return null;
  const pool = getPostgresPool();
  const pollResult = await pool.query<PollRow>("SELECT * FROM gift_polls WHERE card_id = $1 AND status <> 'deleted' LIMIT 1", [cardId]);
  const row = pollResult.rows[0];
  if (!row) return null;
  const [optionsResult, votesResult] = await Promise.all([
    pool.query<OptionRow>("SELECT * FROM gift_poll_options WHERE poll_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at", [row.id]),
    pool.query<{ option_id: string; count: string }>(
      `SELECT v.option_id, count(*)::text AS count
       FROM gift_votes v JOIN contributions c ON c.id = v.greeting_id
       WHERE v.poll_id = $1 AND c.status = 'visible' GROUP BY v.option_id`, [row.id])
  ]);
  const votesByOptionId = Object.fromEntries(votesResult.rows.map((item) => [item.option_id, Number(item.count)]));
  return { ...mapPoll(row), options: optionsResult.rows.map(mapOption), votesByOptionId, totalVotes: Object.values(votesByOptionId).reduce((sum, count) => sum + count, 0) };
};

export const createGiftPoll = async (input: Pick<GiftPoll, "cardId" | "mode" | "title" | "question" | "closesAt">) => {
  if (!isPostgresConfigured()) return unavailable();
  const id = randomUUID();
  const result = await getPostgresPool().query<PollRow>(
    `INSERT INTO gift_polls (id, card_id, mode, title, question, closes_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (card_id) DO UPDATE SET mode = EXCLUDED.mode, title = EXCLUDED.title, question = EXCLUDED.question, closes_at = EXCLUDED.closes_at, updated_at = now()
     RETURNING *`, [id, input.cardId, input.mode, input.title, input.question, input.closesAt]
  );
  return mapPoll(result.rows[0]);
};

export const updateGiftPollSettingsSafely = async (
  pollId: string,
  input: Pick<GiftPoll, "mode" | "title" | "question" | "closesAt">
): Promise<GiftPollMutationResult> => {
  if (!isPostgresConfigured()) return unavailable();
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<PollRow>("SELECT * FROM gift_polls WHERE id = $1 FOR UPDATE", [pollId]);
    const row = current.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return "missing";
    }
    const votes = await client.query<{ has_votes: boolean }>("SELECT EXISTS(SELECT 1 FROM gift_votes WHERE poll_id = $1) AS has_votes", [pollId]);
    const lockedFieldsChanged = row.mode !== input.mode || row.title !== input.title || row.question !== input.question;
    if (votes.rows[0]?.has_votes && lockedFieldsChanged) {
      await client.query("ROLLBACK");
      return "locked";
    }
    await client.query(
      "UPDATE gift_polls SET selected_option_id = CASE WHEN mode <> $2 THEN NULL ELSE selected_option_id END, mode = $2, title = $3, question = $4, closes_at = $5, updated_at = now() WHERE id = $1",
      [pollId, input.mode, input.title, input.question, input.closesAt]
    );
    if (row.mode !== input.mode) {
      await client.query("UPDATE gift_poll_options SET deleted_at = now(), updated_at = now() WHERE poll_id = $1 AND deleted_at IS NULL", [pollId]);
    }
    await client.query("COMMIT");
    return "ok";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const replaceGiftPollOptionsSafely = async (
  pollId: string,
  settings: Pick<GiftPoll, "mode" | "title" | "question" | "closesAt">,
  options: GiftPollOptionWrite[]
): Promise<GiftPollMutationResult> => {
  if (!isPostgresConfigured()) return unavailable();
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<PollRow>("SELECT * FROM gift_polls WHERE id = $1 FOR UPDATE", [pollId]);
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return "missing";
    }
    const votes = await client.query<{ has_votes: boolean }>("SELECT EXISTS(SELECT 1 FROM gift_votes WHERE poll_id = $1) AS has_votes", [pollId]);
    if (votes.rows[0]?.has_votes) {
      await client.query("ROLLBACK");
      return "locked";
    }
    await client.query(
      "UPDATE gift_polls SET mode = $2, title = $3, question = $4, closes_at = $5, updated_at = now() WHERE id = $1",
      [pollId, settings.mode, settings.title, settings.question, settings.closesAt]
    );
    for (const option of options) {
      await client.query(
        `INSERT INTO gift_poll_options (id, poll_id, title, description, image_url, price_label, product_url, sort_order, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = EXCLUDED.image_url,
           price_label = EXCLUDED.price_label, product_url = EXCLUDED.product_url, sort_order = EXCLUDED.sort_order,
           deleted_at = NULL, updated_at = now()`,
        [option.id, pollId, option.title, option.description, option.imageUrl, option.priceLabel, option.productUrl, option.sortOrder]
      );
    }
    await client.query(
      `UPDATE gift_poll_options SET deleted_at = now(), updated_at = now()
       WHERE poll_id = $1 AND deleted_at IS NULL AND NOT (id = ANY($2::uuid[]))`,
      [pollId, options.map((option) => option.id)]
    );
    await client.query("COMMIT");
    return "ok";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const reorderGiftPollOptionsSafely = async (
  pollId: string,
  orderedOptionIds: string[],
  baseOptionIds: string[]
): Promise<GiftPollMutationResult> => {
  if (!isPostgresConfigured()) return unavailable();
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const poll = await client.query<PollRow>("SELECT * FROM gift_polls WHERE id = $1 FOR UPDATE", [pollId]);
    if (!poll.rows[0]) {
      await client.query("ROLLBACK");
      return "missing";
    }
    const votes = await client.query<{ has_votes: boolean }>("SELECT EXISTS(SELECT 1 FROM gift_votes WHERE poll_id = $1) AS has_votes", [pollId]);
    if (votes.rows[0]?.has_votes) {
      await client.query("ROLLBACK");
      return "locked";
    }
    const current = await client.query<{ id: string }>(
      "SELECT id FROM gift_poll_options WHERE poll_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at FOR UPDATE",
      [pollId]
    );
    const currentIds = current.rows.map((row) => row.id);
    const validSet = new Set(orderedOptionIds).size === orderedOptionIds.length
      && orderedOptionIds.length === currentIds.length
      && orderedOptionIds.every((id) => currentIds.includes(id));
    const baseMatches = baseOptionIds.length === currentIds.length && baseOptionIds.every((id, index) => id === currentIds[index]);
    if (!validSet || !baseMatches) {
      await client.query("ROLLBACK");
      return "stale";
    }
    await client.query(
      `UPDATE gift_poll_options AS option SET sort_order = next_order.position - 1, updated_at = now()
       FROM unnest($2::uuid[]) WITH ORDINALITY AS next_order(id, position)
       WHERE option.poll_id = $1 AND option.id = next_order.id`,
      [pollId, orderedOptionIds]
    );
    await client.query("COMMIT");
    return "ok";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const openGiftPoll = async (pollId: string) => {
  if (!isPostgresConfigured()) return unavailable();
  const result = await getPostgresPool().query<PollRow>(
    `UPDATE gift_polls SET status = 'open', updated_at = now()
     WHERE id = $1 AND status IN ('draft', 'closed')
       AND (SELECT count(*) FROM gift_poll_options WHERE poll_id = $1 AND deleted_at IS NULL) BETWEEN 2 AND 6
     RETURNING *`, [pollId]
  );
  return result.rows[0] ? mapPoll(result.rows[0]) : null;
};

export const closeGiftPoll = async (pollId: string) => {
  if (!isPostgresConfigured()) return unavailable();
  const result = await getPostgresPool().query<PollRow>(
    "UPDATE gift_polls SET status = 'closed', closed_at = COALESCE(closed_at, now()), updated_at = now() WHERE id = $1 AND status IN ('draft', 'open') RETURNING *", [pollId]
  );
  return result.rows[0] ? mapPoll(result.rows[0]) : null;
};

export const selectGiftPollOption = async (pollId: string, optionId: string) => {
  if (!isPostgresConfigured()) return unavailable();
  const result = await getPostgresPool().query<PollRow>(
    `UPDATE gift_polls SET selected_option_id = $2, updated_at = now()
     WHERE id = $1 AND status = 'closed' AND EXISTS (SELECT 1 FROM gift_poll_options WHERE id = $2 AND poll_id = $1 AND deleted_at IS NULL)
     RETURNING *`, [pollId, optionId]
  );
  return result.rows[0] ? mapPoll(result.rows[0]) : null;
};

export const getParticipantGiftPoll = async (cardId: string, participantTokenHash: string): Promise<ParticipantGiftPoll | null> => {
  if (!isPostgresConfigured()) return null;
  const pool = getPostgresPool();
  const pollResult = await pool.query<PollRow>(
    `SELECT * FROM gift_polls WHERE card_id = $1 AND status = 'open' LIMIT 1`, [cardId]
  );
  const row = pollResult.rows[0];
  if (!row) return null;
  const [options, vote] = await Promise.all([
    pool.query<OptionRow>("SELECT * FROM gift_poll_options WHERE poll_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at", [row.id]),
    pool.query<{ option_id: string }>("SELECT option_id FROM gift_votes WHERE poll_id = $1 AND participant_token_hash = $2", [row.id, participantTokenHash])
  ]);
  return { id: row.id, mode: row.mode, title: row.title, question: row.question, closesAt: row.closes_at ? iso(row.closes_at) : null,
    options: options.rows.map(mapOption).map(({ id, title, description, imageUrl, priceLabel, productUrl }) => ({ id, title, description, imageUrl, priceLabel, productUrl })),
    selectedOptionId: vote.rows[0]?.option_id ?? null };
};

/** A small, non-interactive preview shown before a participant submits a greeting. */
export const getGiftPollTeaser = async (cardId: string): Promise<Pick<ParticipantGiftPoll, "mode" | "title" | "question" | "options"> | null> => {
  if (!isPostgresConfigured()) return null;
  const pool = getPostgresPool();
  const pollResult = await pool.query<PollRow>("SELECT * FROM gift_polls WHERE card_id = $1 AND status = 'open' LIMIT 1", [cardId]);
  const row = pollResult.rows[0];
  if (!row) return null;
  const options = await pool.query<OptionRow>(
    "SELECT * FROM gift_poll_options WHERE poll_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at LIMIT 3",
    [row.id]
  );
  return {
    mode: row.mode,
    title: row.title,
    question: row.question,
    options: options.rows.map(mapOption).map(({ id, title, description, imageUrl, priceLabel, productUrl }) => ({ id, title, description, imageUrl, priceLabel, productUrl }))
  };
};

export const getClosedGiftPollParticipantState = async (cardId: string, participantTokenHash: string) => {
  if (!isPostgresConfigured()) return null;
  const result = await getPostgresPool().query<{ has_vote: boolean; id: string | null; title: string | null; description: string | null; image_url: string | null; price_label: string | null; product_url: string | null }>(
    `SELECT EXISTS(
       SELECT 1 FROM gift_votes v JOIN gift_polls p ON p.id = v.poll_id
       WHERE p.card_id = $1 AND p.status = 'closed' AND v.participant_token_hash = $2
     ) AS has_vote,
     o.id, o.title, o.description, o.image_url, o.price_label, o.product_url
     FROM gift_polls p
     LEFT JOIN gift_poll_options o ON o.id = p.selected_option_id AND o.deleted_at IS NULL
     WHERE p.card_id = $1 AND p.status = 'closed'
       AND EXISTS(
       SELECT 1 FROM contributions
       WHERE card_id = $1 AND participant_token_hash = $2 AND status = 'visible'
     ) LIMIT 1`,
    [cardId, participantTokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  const selectedOption = row.id && row.title ? {
    id: row.id, title: row.title, description: row.description, imageUrl: row.image_url,
    priceLabel: row.price_label, productUrl: row.product_url
  } : null;
  return { hasVote: row.has_vote, selectedOption } satisfies ClosedParticipantGiftPollState;
};

export const upsertGiftVote = async (cardId: string, optionId: string, participantTokenHash: string) => {
  if (!isPostgresConfigured()) return unavailable();
  const pool = getPostgresPool();
  const result = await pool.query<{ poll_id: string; greeting_id: string }>(
    `WITH active_poll AS (
       SELECT id FROM gift_polls WHERE card_id = $1 AND status = 'open' FOR SHARE
     ), participant_greeting AS (
       SELECT id FROM contributions WHERE card_id = $1 AND participant_token_hash = $3 AND status = 'visible' LIMIT 1
     ), valid_option AS (
       SELECT o.id, o.poll_id FROM gift_poll_options o JOIN active_poll p ON p.id = o.poll_id WHERE o.id = $2 AND o.deleted_at IS NULL
     )
     INSERT INTO gift_votes (id, poll_id, option_id, greeting_id, participant_token_hash)
     SELECT $4, o.poll_id, o.id, g.id, $3 FROM valid_option o CROSS JOIN participant_greeting g
     ON CONFLICT (poll_id, participant_token_hash) DO UPDATE SET option_id = EXCLUDED.option_id, greeting_id = EXCLUDED.greeting_id, updated_at = now()
     RETURNING poll_id, greeting_id`, [cardId, optionId, participantTokenHash, randomUUID()]
  );
  return result.rows[0] ?? null;
};
