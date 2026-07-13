import { getPostgresPool } from "@/lib/db/postgres";
import type { CardTemplateId } from "@/lib/cards/templates";
import type { CardDraft, CardMediaAsset, CardStatus, Contribution } from "@/lib/cards/types";
import { deleteStoredCardMediaFile } from "@/lib/media/local-card-media-storage";
import { CARD_CONTRIBUTION_LIMIT, ContributionLimitReachedError } from "@/lib/contributions/limits";
import type {
  FinalCardBlockOrder,
  FinalCardBlockSettings,
  FinalCardMainGreetingSettings,
  FinalCardMemorySettings,
  FinalCardMessageSettings
} from "@/lib/final-card/types";

type CardRow = {
  id: string;
  public_slug: string;
  manage_token: string;
  final_slug: string;
  recipient_name: string;
  occasion: CardDraft["occasion"];
  occasion_text: string;
  from_label: string;
  organizer_name: string;
  organizer_email: string;
  event_date: Date | string | null;
  description: string | null;
  signature: string | null;
  template_id: CardTemplateId;
  final_block_settings: FinalCardBlockSettings | null;
  final_block_order: FinalCardBlockOrder | null;
  final_message_settings: FinalCardMessageSettings | null;
  final_main_greeting_settings: FinalCardMainGreetingSettings | null;
  final_memory_settings: FinalCardMemorySettings | null;
  status: CardStatus;
  payment_status: CardDraft["paymentStatus"];
  deleted_at: Date | string | null;
  purge_after: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ContributionRow = {
  id: string;
  card_id: string;
  author_name: string;
  author_role: string | null;
  author_avatar_url: string | null;
  message: string;
  sort_order: number;
  status: Contribution["status"];
  source: Contribution["source"];
  participant_token_hash: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type MediaRow = {
  id: string;
  card_id: string;
  slot: CardMediaAsset["slot"];
  public_url: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  caption_title: string;
  caption_subtitle: string;
  created_at: Date | string;
  updated_at: Date | string;
};

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);
const toDateOnly = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const jsonParam = (value: unknown) => (value === null || value === undefined ? null : JSON.stringify(value));

const mapCard = (row: CardRow): CardDraft => ({
  id: row.id,
  publicSlug: row.public_slug,
  manageToken: row.manage_token,
  finalSlug: row.final_slug,
  recipientName: row.recipient_name,
  occasion: row.occasion,
  occasionText: row.occasion_text,
  fromLabel: row.from_label,
  organizerName: row.organizer_name,
  organizerEmail: row.organizer_email,
  eventDate: toDateOnly(row.event_date),
  description: row.description,
  signature: row.signature,
  templateId: row.template_id,
  finalBlockSettings: row.final_block_settings,
  finalBlockOrder: row.final_block_order,
  finalMessageSettings: row.final_message_settings,
  finalMainGreetingSettings: row.final_main_greeting_settings,
  finalMemorySettings: row.final_memory_settings,
  status: row.status,
  paymentStatus: row.payment_status,
  deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
  purgeAfter: row.purge_after ? toIso(row.purge_after) : null,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const mapContribution = (row: ContributionRow): Contribution => ({
  id: row.id,
  cardId: row.card_id,
  authorName: row.author_name,
  authorRole: row.author_role,
  authorAvatarUrl: row.author_avatar_url,
  message: row.message,
  sortOrder: row.sort_order,
  status: row.status,
  source: row.source,
  participantTokenHash: row.participant_token_hash,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const mapMedia = (row: MediaRow): CardMediaAsset => ({
  id: row.id,
  cardId: row.card_id,
  slot: row.slot,
  publicUrl: row.public_url,
  storagePath: row.storage_path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  captionTitle: row.caption_title,
  captionSubtitle: row.caption_subtitle,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

const selectCardBy = async (column: "id" | "public_slug" | "manage_token", value: string, includeDeleted = false) => {
  const deletedFilter = includeDeleted ? "" : "AND deleted_at IS NULL";
  const result = await getPostgresPool().query<CardRow>(`SELECT * FROM cards WHERE ${column} = $1 ${deletedFilter} LIMIT 1`, [value]);
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const saveCardDraft = async (card: CardDraft) => {
  await getPostgresPool().query(
    `
      INSERT INTO cards (
        id, public_slug, manage_token, final_slug, recipient_name, occasion, occasion_text,
        from_label, organizer_name, organizer_email, event_date, description, signature,
        template_id, final_block_settings, final_block_order, final_message_settings,
        final_main_greeting_settings, final_memory_settings, status, payment_status,
        deleted_at, purge_after, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15::jsonb, $16::jsonb, $17::jsonb,
        $18::jsonb, $19::jsonb, $20, $21,
        $22, $23, $24, $25
      )
    `,
    [
      card.id,
      card.publicSlug,
      card.manageToken,
      card.finalSlug,
      card.recipientName,
      card.occasion,
      card.occasionText,
      card.fromLabel,
      card.organizerName,
      card.organizerEmail,
      card.eventDate,
      card.description,
      card.signature,
      card.templateId,
      jsonParam(card.finalBlockSettings),
      jsonParam(card.finalBlockOrder),
      jsonParam(card.finalMessageSettings),
      jsonParam(card.finalMainGreetingSettings),
      jsonParam(card.finalMemorySettings),
      card.status,
      card.paymentStatus,
      card.deletedAt,
      card.purgeAfter,
      card.createdAt,
      card.updatedAt
    ]
  );
};

export const listCardDrafts = async () => {
  const result = await getPostgresPool().query<CardRow>("SELECT * FROM cards ORDER BY created_at DESC");
  return result.rows.map(mapCard);
};

export const listCardDraftsByOrganizerEmail = async (email: string) => {
  const result = await getPostgresPool().query<CardRow>(
    "SELECT * FROM cards WHERE LOWER(organizer_email) = LOWER($1) ORDER BY created_at DESC",
    [email]
  );
  return result.rows.map(mapCard);
};

export const getCardDraftByPublicSlug = (publicSlug: string) => selectCardBy("public_slug", publicSlug);
export const getCardDraftByManageToken = (manageToken: string) => selectCardBy("manage_token", manageToken);
export const getCardDraftById = (cardId: string) => selectCardBy("id", cardId, true);

export const softDeleteCard = async (cardId: string) => {
  const result = await getPostgresPool().query<CardRow>(
    `UPDATE cards
     SET deleted_at = now(), purge_after = now() + interval '30 days', updated_at = now()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [cardId]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const restoreDeletedCard = async (cardId: string) => {
  const result = await getPostgresPool().query<CardRow>(
    `UPDATE cards
     SET deleted_at = NULL, purge_after = NULL, updated_at = now()
     WHERE id = $1 AND deleted_at IS NOT NULL AND purge_after > now()
     RETURNING *`,
    [cardId]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export type CardRetentionCandidate = { id: string; reason: "deleted" | "inactive_draft" };

export const listCardRetentionCandidates = async (draftCutoff: Date, now: Date): Promise<CardRetentionCandidate[]> => {
  const result = await getPostgresPool().query<CardRetentionCandidate>(
    `SELECT id,
            CASE WHEN deleted_at IS NOT NULL THEN 'deleted' ELSE 'inactive_draft' END AS reason
     FROM cards
     WHERE (deleted_at IS NOT NULL AND purge_after <= $2)
        OR (deleted_at IS NULL
            AND status <> 'published'
            AND updated_at < $1
            AND NOT EXISTS (
              SELECT 1 FROM contributions
              WHERE contributions.card_id = cards.id AND contributions.updated_at >= $1
            )
            AND NOT EXISTS (
              SELECT 1 FROM card_media_assets
              WHERE card_media_assets.card_id = cards.id AND card_media_assets.updated_at >= $1
            ))`,
    [draftCutoff, now]
  );
  return result.rows;
};

export const permanentlyDeleteCard = async (cardId: string): Promise<string[]> => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const media = await client.query<{ storage_path: string }>(
      "SELECT storage_path FROM card_media_assets WHERE card_id = $1",
      [cardId]
    );
    await client.query("DELETE FROM cards WHERE id = $1", [cardId]);
    await client.query("COMMIT");
    return media.rows.map((row) => row.storage_path).filter(Boolean);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateCardFinalBlockSettings = async (
  cardId: string,
  finalBlockSettings: FinalCardBlockSettings,
  finalBlockOrder: FinalCardBlockOrder | null
) => {
  const result = await getPostgresPool().query<CardRow>(
    `
      UPDATE cards
      SET final_block_settings = $2::jsonb,
          final_block_order = $3::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [cardId, jsonParam(finalBlockSettings), jsonParam(finalBlockOrder)]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const updateCardFinalPresentationSettings = async (
  cardId: string,
  templateId: CardTemplateId,
  finalBlockSettings: FinalCardBlockSettings,
  finalBlockOrder: FinalCardBlockOrder | null,
  finalMessageSettings: FinalCardMessageSettings,
  finalMainGreetingSettings: FinalCardMainGreetingSettings,
  finalMemorySettings: FinalCardMemorySettings
) => {
  const result = await getPostgresPool().query<CardRow>(
    `
      UPDATE cards
      SET template_id = $2,
          final_block_settings = $3::jsonb,
          final_block_order = $4::jsonb,
          final_message_settings = $5::jsonb,
          final_main_greeting_settings = $6::jsonb,
          final_memory_settings = $7::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      cardId,
      templateId,
      jsonParam(finalBlockSettings),
      jsonParam(finalBlockOrder),
      jsonParam(finalMessageSettings),
      jsonParam(finalMainGreetingSettings),
      jsonParam(finalMemorySettings)
    ]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const updateCardMainGreetingSettings = async (
  cardId: string,
  finalMainGreetingSettings: FinalCardMainGreetingSettings
) => {
  const result = await getPostgresPool().query<CardRow>(
    `
      UPDATE cards
      SET final_main_greeting_settings = $2::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [cardId, jsonParam(finalMainGreetingSettings)]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const updateCardDraftBasics = async (
  cardId: string,
  basics: Pick<
    CardDraft,
    | "recipientName"
    | "occasion"
    | "occasionText"
    | "fromLabel"
    | "organizerName"
    | "organizerEmail"
    | "eventDate"
    | "description"
    | "signature"
  >
) => {
  const result = await getPostgresPool().query<CardRow>(
    `
      UPDATE cards
      SET recipient_name = $2,
          occasion = $3,
          occasion_text = $4,
          from_label = $5,
          organizer_name = $6,
          organizer_email = $7,
          event_date = $8,
          description = $9,
          signature = $10,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      cardId,
      basics.recipientName,
      basics.occasion,
      basics.occasionText,
      basics.fromLabel,
      basics.organizerName,
      basics.organizerEmail,
      basics.eventDate,
      basics.description,
      basics.signature
    ]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const updateCardStatus = async (cardId: string, status: CardStatus) => {
  const result = await getPostgresPool().query<CardRow>(
    "UPDATE cards SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [cardId, status]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const updateCardPaymentStatus = async (
  cardId: string,
  paymentStatus: CardDraft["paymentStatus"]
) => {
  const result = await getPostgresPool().query<CardRow>(
    "UPDATE cards SET payment_status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [cardId, paymentStatus]
  );
  return result.rows[0] ? mapCard(result.rows[0]) : null;
};

export const listCardMediaAssetsByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<MediaRow>(
    "SELECT * FROM card_media_assets WHERE card_id = $1 ORDER BY created_at ASC",
    [cardId]
  );
  return result.rows.map(mapMedia);
};

export const upsertCardMediaAsset = async (asset: CardMediaAsset) => {
  const existingResult = await getPostgresPool().query<MediaRow>(
    "SELECT * FROM card_media_assets WHERE card_id = $1 AND slot = $2 LIMIT 1",
    [asset.cardId, asset.slot]
  );
  const existing = existingResult.rows[0] ? mapMedia(existingResult.rows[0]) : null;
  const nextAsset = existing ? { ...asset, id: existing.id, createdAt: existing.createdAt } : asset;

  if (existing && existing.storagePath !== asset.storagePath) {
    await deleteStoredCardMediaFile(existing.storagePath);
  }

  await getPostgresPool().query(
    `
      INSERT INTO card_media_assets (
        id, card_id, slot, public_url, storage_path, file_name, mime_type,
        size_bytes, caption_title, caption_subtitle, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (card_id, slot) DO UPDATE
      SET public_url = EXCLUDED.public_url,
          storage_path = EXCLUDED.storage_path,
          file_name = EXCLUDED.file_name,
          mime_type = EXCLUDED.mime_type,
          size_bytes = EXCLUDED.size_bytes,
          caption_title = EXCLUDED.caption_title,
          caption_subtitle = EXCLUDED.caption_subtitle,
          updated_at = EXCLUDED.updated_at
    `,
    [
      nextAsset.id,
      nextAsset.cardId,
      nextAsset.slot,
      nextAsset.publicUrl,
      nextAsset.storagePath,
      nextAsset.fileName,
      nextAsset.mimeType,
      nextAsset.sizeBytes,
      nextAsset.captionTitle,
      nextAsset.captionSubtitle,
      nextAsset.createdAt,
      nextAsset.updatedAt
    ]
  );
  return nextAsset;
};

export const updateCardMediaAssetCaption = async (
  assetId: string,
  captionTitle: string,
  captionSubtitle: string,
  slot?: CardMediaAsset["slot"]
) => {
  const result = await getPostgresPool().query<MediaRow>(
    `
      UPDATE card_media_assets
      SET caption_title = $2,
          caption_subtitle = $3,
          slot = COALESCE($4, slot),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [assetId, captionTitle, captionSubtitle, slot ?? null]
  );
  return result.rows[0] ? mapMedia(result.rows[0]) : null;
};

export const swapCardMediaAssetSlots = async (cardId: string, leftAssetId: string, rightAssetId: string) => {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query<MediaRow>(
      "SELECT * FROM card_media_assets WHERE card_id = $1 AND id IN ($2, $3) ORDER BY id",
      [cardId, leftAssetId, rightAssetId]
    );
    const left = currentResult.rows.find((row) => row.id === leftAssetId);
    const right = currentResult.rows.find((row) => row.id === rightAssetId);

    if (!left || !right) {
      await client.query("ROLLBACK");
      return [];
    }

    await client.query("DELETE FROM card_media_assets WHERE id = $1", [rightAssetId]);
    const leftResult = await client.query<MediaRow>(
      "UPDATE card_media_assets SET slot = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [leftAssetId, right.slot]
    );
    const rightResult = await client.query<MediaRow>(
      `
        INSERT INTO card_media_assets (
          id, card_id, slot, public_url, storage_path, file_name, mime_type,
          size_bytes, caption_title, caption_subtitle, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        RETURNING *
      `,
      [
        right.id,
        right.card_id,
        left.slot,
        right.public_url,
        right.storage_path,
        right.file_name,
        right.mime_type,
        right.size_bytes,
        right.caption_title,
        right.caption_subtitle,
        right.created_at
      ]
    );

    await client.query("COMMIT");
    return [...leftResult.rows, ...rightResult.rows].map(mapMedia);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteCardMediaAsset = async (assetId: string) => {
  const result = await getPostgresPool().query<MediaRow>(
    "DELETE FROM card_media_assets WHERE id = $1 RETURNING *",
    [assetId]
  );
  const current = result.rows[0] ? mapMedia(result.rows[0]) : null;

  if (current) {
    await deleteStoredCardMediaFile(current.storagePath);
  }

  return current;
};

export const saveContribution = async (contribution: Contribution) => {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT id FROM cards WHERE id = $1 FOR UPDATE", [contribution.cardId]);
    const countResult = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM contributions WHERE card_id = $1 AND status <> 'deleted'",
      [contribution.cardId]
    );
    if (Number(countResult.rows[0]?.count ?? 0) >= CARD_CONTRIBUTION_LIMIT) {
      throw new ContributionLimitReachedError();
    }
    const orderResult = await client.query<{ next_order: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM contributions WHERE card_id = $1",
      [contribution.cardId]
    );
    const sortOrder =
      typeof contribution.sortOrder === "number" && Number.isFinite(contribution.sortOrder)
        ? contribution.sortOrder
        : orderResult.rows[0]?.next_order ?? 0;

    await client.query(
      `
        INSERT INTO contributions (
          id, card_id, author_name, author_role, author_avatar_url, message,
          sort_order, status, source, participant_token_hash, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        contribution.id,
        contribution.cardId,
        contribution.authorName,
        contribution.authorRole,
        contribution.authorAvatarUrl,
        contribution.message,
        sortOrder,
        contribution.status,
        contribution.source,
        contribution.participantTokenHash,
        contribution.createdAt,
        contribution.updatedAt
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listContributionsByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<ContributionRow>(
    "SELECT * FROM contributions WHERE card_id = $1 AND status = 'visible' ORDER BY sort_order ASC, created_at ASC",
    [cardId]
  );
  return result.rows.map(mapContribution);
};

export const listAllContributionsByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<ContributionRow>(
    "SELECT * FROM contributions WHERE card_id = $1 ORDER BY sort_order ASC, created_at ASC",
    [cardId]
  );
  return result.rows.map(mapContribution);
};

export const updateContributionStatus = async (
  contributionId: string,
  status: Contribution["status"]
) => {
  const result = await getPostgresPool().query<ContributionRow>(
    "UPDATE contributions SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [contributionId, status]
  );
  return result.rows[0] ? mapContribution(result.rows[0]) : null;
};

export const moveContribution = async (contributionId: string, direction: "up" | "down") => {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    const currentResult = await client.query<ContributionRow>("SELECT * FROM contributions WHERE id = $1", [contributionId]);
    const current = currentResult.rows[0];

    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const siblingsResult = await client.query<ContributionRow>(
      "SELECT * FROM contributions WHERE card_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [current.card_id]
    );
    const siblings = siblingsResult.rows;
    const currentIndex = siblings.findIndex((item) => item.id === contributionId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= siblings.length) {
      await client.query("COMMIT");
      return mapContribution(current);
    }

    const target = siblings[targetIndex];
    await client.query("UPDATE contributions SET sort_order = $2, updated_at = now() WHERE id = $1", [
      current.id,
      target.sort_order
    ]);
    await client.query("UPDATE contributions SET sort_order = $2, updated_at = now() WHERE id = $1", [
      target.id,
      current.sort_order
    ]);
    await client.query("COMMIT");

    const updated = await getPostgresPool().query<ContributionRow>("SELECT * FROM contributions WHERE id = $1", [
      contributionId
    ]);
    return updated.rows[0] ? mapContribution(updated.rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const reorderContributions = async (cardId: string, orderedContributionIds: string[]) => {
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    const siblingsResult = await client.query<ContributionRow>(
      "SELECT * FROM contributions WHERE card_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [cardId]
    );
    const siblings = siblingsResult.rows;
    const siblingIds = new Set(siblings.map((item) => item.id));
    const normalizedOrder = orderedContributionIds.filter((id) => siblingIds.has(id));

    for (const item of siblings) {
      if (!normalizedOrder.includes(item.id)) {
        normalizedOrder.push(item.id);
      }
    }

    for (const [index, id] of normalizedOrder.entries()) {
      await client.query("UPDATE contributions SET sort_order = $2, updated_at = now() WHERE id = $1", [id, index]);
    }

    await client.query("COMMIT");
    const updated = await getPostgresPool().query<ContributionRow>(
      "SELECT * FROM contributions WHERE card_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [cardId]
    );
    return updated.rows.map(mapContribution);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateContributionMessage = async (
  contributionId: string,
  message: Contribution["message"]
) => {
  const result = await getPostgresPool().query<ContributionRow>(
    "UPDATE contributions SET message = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [contributionId, message]
  );
  return result.rows[0] ? mapContribution(result.rows[0]) : null;
};
