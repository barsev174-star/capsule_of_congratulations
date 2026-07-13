import { randomUUID } from "node:crypto";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { GiftPoll, GiftPollOption, GiftPollWithOptions, ParticipantGiftPoll } from "./types";

type PollRow = {
  id: string; card_id: string; mode: GiftPoll["mode"]; title: string; question: string;
  status: GiftPoll["status"]; closes_at: Date | string | null; selected_option_id: string | null;
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
  closesAt: row.closes_at ? iso(row.closes_at) : null, selectedOptionId: row.selected_option_id,
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

export const saveGiftPollOption = async (input: Omit<GiftPollOption, "createdAt" | "updatedAt" | "deletedAt">) => {
  if (!isPostgresConfigured()) return unavailable();
  const result = await getPostgresPool().query<OptionRow>(
    `INSERT INTO gift_poll_options (id, poll_id, title, description, image_url, price_label, product_url, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, image_url = EXCLUDED.image_url,
       price_label = EXCLUDED.price_label, product_url = EXCLUDED.product_url, sort_order = EXCLUDED.sort_order, updated_at = now()
     RETURNING *`, [input.id, input.pollId, input.title, input.description, input.imageUrl, input.priceLabel, input.productUrl, input.sortOrder]
  );
  return mapOption(result.rows[0]);
};

export const deleteGiftPollOptionsExcept = async (pollId: string, optionIds: string[]) => {
  if (!isPostgresConfigured()) return unavailable();
  await getPostgresPool().query(
    `UPDATE gift_poll_options SET deleted_at = now(), updated_at = now()
     WHERE poll_id = $1 AND deleted_at IS NULL AND NOT (id = ANY($2::uuid[]))`,
    [pollId, optionIds]
  );
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
    "UPDATE gift_polls SET status = 'closed', updated_at = now() WHERE id = $1 AND status IN ('draft', 'open') RETURNING *", [pollId]
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
  const result = await getPostgresPool().query<{ has_vote: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM gift_votes v
       JOIN gift_polls p ON p.id = v.poll_id
       WHERE p.card_id = $1 AND p.status = 'closed' AND v.participant_token_hash = $2
     ) AS has_vote
     WHERE EXISTS(
       SELECT 1 FROM contributions
       WHERE card_id = $1 AND participant_token_hash = $2 AND status = 'visible'
     )
       AND EXISTS(SELECT 1 FROM gift_polls WHERE card_id = $1 AND status = 'closed')`,
    [cardId, participantTokenHash]
  );
  return result.rows[0] ?? null;
};

export const upsertGiftVote = async (cardId: string, optionId: string, participantTokenHash: string) => {
  if (!isPostgresConfigured()) return unavailable();
  const pool = getPostgresPool();
  const result = await pool.query<{ poll_id: string; greeting_id: string }>(
    `WITH active_poll AS (
       SELECT id FROM gift_polls WHERE card_id = $1 AND status = 'open'
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
