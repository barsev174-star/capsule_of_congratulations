import { randomUUID } from "node:crypto";
import { getPostgresPool } from "@/lib/db/postgres";
import type { PublicCardShare, PublicCardSharePhoto, PublicShareHeadlinePreset, PublicSharePhrase, PublicSharePhraseCandidate, PublicShareQuality } from "./types";

type ShareRow = {
  id: string; card_id: string; token_hash: string | null; status: "DRAFT" | "ACTIVE" | "REVOKED"; payload_version: 1 | 2;
  display_name: string | null; headline_preset: PublicShareHeadlinePreset; show_occasion: boolean; show_event_date: boolean; show_greeting_count: boolean;
  show_photo_count: boolean; public_summary: string | null; public_qualities: PublicShareQuality[]; public_phrases: PublicSharePhrase[];
  show_public_name: boolean; public_phrase_candidate_ids: string[]; photo_consent_version: string | null; photo_consent_accepted_at: Date | string | null; created_at: Date | string; updated_at: Date | string; activated_at: Date | string | null; revision: number; revoked_at: Date | string | null; revoked_by: string | null;
};

type PhotoRow = {
  id: string; public_share_id: string; card_media_asset_id: string; storage_path: string; file_name: string; mime_type: string;
  size_bytes: number; sort_order: number; public_caption: string; created_at: Date | string; updated_at: Date | string;
};
type PhraseCandidateRow = { id: string; card_id: string; text: string; sort_order: number; is_recommended: boolean; created_at: Date | string; updated_at: Date | string; };

const iso = (value: Date | string | null) => value ? (value instanceof Date ? value.toISOString() : value) : null;
const array = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const mapShare = (row: ShareRow): PublicCardShare => ({
  id: row.id, cardId: row.card_id, tokenHash: row.token_hash, status: row.status, payloadVersion: row.payload_version,
  displayName: row.display_name, showPublicName: row.show_public_name, headlinePreset: row.headline_preset, showOccasion: row.show_occasion, showEventDate: row.show_event_date ?? true,
  showGreetingCount: row.show_greeting_count, showPhotoCount: row.show_photo_count, publicSummary: row.public_summary,
  publicQualities: array<PublicShareQuality>(row.public_qualities), publicPhrases: array<PublicSharePhrase>(row.public_phrases), publicPhraseCandidateIds: array<string>(row.public_phrase_candidate_ids),
  photoConsentVersion: row.photo_consent_version, photoConsentAcceptedAt: iso(row.photo_consent_accepted_at),
  createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!, activatedAt: iso(row.activated_at), revision: row.revision, revokedAt: iso(row.revoked_at), revokedBy: row.revoked_by
});

const mapPhoto = (row: PhotoRow): PublicCardSharePhoto => ({
  id: row.id, publicShareId: row.public_share_id, cardMediaAssetId: row.card_media_asset_id, storagePath: row.storage_path,
  fileName: row.file_name, mimeType: row.mime_type, sizeBytes: row.size_bytes, sortOrder: row.sort_order,
  publicCaption: row.public_caption, createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)!
});
const mapPhraseCandidate = (row: PhraseCandidateRow): PublicSharePhraseCandidate => ({ id: row.id, cardId: row.card_id, text: row.text, sortOrder: row.sort_order, isRecommended: row.is_recommended, createdAt: iso(row.created_at)!, updatedAt: iso(row.updated_at)! });

export const getActivePublicShareByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<ShareRow>("SELECT * FROM public_card_shares WHERE card_id = $1 AND status = 'ACTIVE' LIMIT 1", [cardId]);
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const getPublicShareDraftOrActiveByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<ShareRow>("SELECT * FROM public_card_shares WHERE card_id = $1 AND status IN ('DRAFT', 'ACTIVE') ORDER BY created_at DESC LIMIT 1", [cardId]);
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const hasRevokedPublicShareByCardId = async (cardId: string) => {
  const result = await getPostgresPool().query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM public_card_shares WHERE card_id = $1 AND status = 'REVOKED') AS exists",
    [cardId]
  );
  return result.rows[0]?.exists ?? false;
};

export const getPublicShareByTokenHash = async (tokenHash: string) => {
  const result = await getPostgresPool().query<ShareRow>("SELECT * FROM public_card_shares WHERE token_hash = $1 LIMIT 1", [tokenHash]);
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const getAccessiblePublicShareByTokenHash = async (tokenHash: string) => {
  const result = await getPostgresPool().query<ShareRow>(
    `SELECT share.* FROM public_card_shares share
     JOIN cards card ON card.id = share.card_id
     WHERE share.token_hash = $1 AND share.status = 'ACTIVE'
       AND card.delivery_status = 'DELIVERED' AND card.is_hidden = false
       AND card.deleted_at IS NULL AND card.purged_at IS NULL
       AND ((card.payment_status = 'PAID' AND card.active_paid_order_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM payment_orders payment WHERE payment.id = card.active_paid_order_id
           AND payment.card_id = card.id AND payment.status = 'PAID'
           AND payment.total_refunded_amount < payment.payable_amount AND payment.revoked_at IS NULL
       )) OR EXISTS (
         SELECT 1 FROM card_access_grants access_grant WHERE access_grant.id = card.active_access_grant_id
           AND access_grant.status = 'ACTIVE' AND (access_grant.expires_at IS NULL OR access_grant.expires_at > now())
       )) LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const getPublicShareById = async (id: string) => {
  const result = await getPostgresPool().query<ShareRow>("SELECT * FROM public_card_shares WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const createPublicShare = async (input: { id: string; cardId: string; tokenHash: string | null; displayName: string | null; payloadVersion?: 1 | 2 }) => {
  const result = await getPostgresPool().query<ShareRow>(
    `INSERT INTO public_card_shares (id, card_id, token_hash, display_name, payload_version, status)
     VALUES ($1, $2, $3, $4, $5, 'DRAFT') RETURNING *`, [input.id, input.cardId, input.tokenHash, input.displayName, input.payloadVersion ?? 1]
  );
  return mapShare(result.rows[0]);
};

export const updatePublicShare = async (share: PublicCardShare) => {
  const result = await getPostgresPool().query<ShareRow>(
    `UPDATE public_card_shares SET display_name = $2, headline_preset = $3, show_occasion = $4, show_event_date = $5, show_greeting_count = $6,
      show_photo_count = $7, public_summary = $8, public_qualities = $9::jsonb, public_phrases = $10::jsonb,
      photo_consent_version = $11, photo_consent_accepted_at = $12, updated_at = now() WHERE id = $1 AND status IN ('DRAFT', 'ACTIVE') RETURNING *`,
    [share.id, share.displayName, share.headlinePreset, share.showOccasion, share.showEventDate, share.showGreetingCount, share.showPhotoCount,
      share.publicSummary, JSON.stringify(share.publicQualities), JSON.stringify(share.publicPhrases), share.photoConsentVersion, share.photoConsentAcceptedAt]
  );
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const revokePublicShare = async (shareId: string) => {
  const result = await getPostgresPool().query<ShareRow>("UPDATE public_card_shares SET status = 'REVOKED', revoked_at = now(), updated_at = now() WHERE id = $1 AND status = 'ACTIVE' RETURNING *", [shareId]);
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const activatePublicShare = async (shareId: string, tokenHash: string) => {
  const result = await getPostgresPool().query<ShareRow>(
    "UPDATE public_card_shares SET status = 'ACTIVE', token_hash = $2, activated_at = now(), revision = revision + 1, updated_at = now() WHERE id = $1 AND status = 'DRAFT' RETURNING *",
    [shareId, tokenHash]
  );
  return result.rows[0] ? mapShare(result.rows[0]) : null;
};

export const listPublicSharePhotos = async (publicShareId: string) => {
  const result = await getPostgresPool().query<PhotoRow>("SELECT * FROM public_card_share_photos WHERE public_share_id = $1 ORDER BY sort_order ASC", [publicShareId]);
  return result.rows.map(mapPhoto);
};

export const replacePublicSharePhotos = async (publicShareId: string, photos: Omit<PublicCardSharePhoto, "id" | "createdAt" | "updatedAt">[]) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM public_card_share_photos WHERE public_share_id = $1", [publicShareId]);
    const saved: PublicCardSharePhoto[] = [];
    for (const photo of photos) {
      const result = await client.query<PhotoRow>(
        `INSERT INTO public_card_share_photos (id, public_share_id, card_media_asset_id, storage_path, file_name, mime_type, size_bytes, sort_order, public_caption)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [randomUUID(), publicShareId, photo.cardMediaAssetId, photo.storagePath, photo.fileName, photo.mimeType, photo.sizeBytes, photo.sortOrder, photo.publicCaption]
      );
      saved.push(mapPhoto(result.rows[0]));
    }
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
};

export const getPublicSharePhoto = async (publicShareId: string, photoId: string) => {
  const result = await getPostgresPool().query<PhotoRow>("SELECT * FROM public_card_share_photos WHERE public_share_id = $1 AND id = $2 LIMIT 1", [publicShareId, photoId]);
  return result.rows[0] ? mapPhoto(result.rows[0]) : null;
};

export const listPublicSharePhraseCandidates = async (cardId: string) => {
  const result = await getPostgresPool().query<PhraseCandidateRow>("SELECT * FROM public_card_share_phrase_candidates WHERE card_id = $1 ORDER BY sort_order ASC", [cardId]);
  return result.rows.map(mapPhraseCandidate);
};

export const replacePublicSharePhraseCandidates = async (cardId: string, candidates: Array<{ text: string; isRecommended: boolean }>) => {
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM public_card_share_phrase_candidates WHERE card_id = $1", [cardId]);
    const saved: PublicSharePhraseCandidate[] = [];
    for (const [sortOrder, candidate] of candidates.entries()) {
      const result = await client.query<PhraseCandidateRow>("INSERT INTO public_card_share_phrase_candidates (id, card_id, text, sort_order, is_recommended) VALUES ($1, $2, $3, $4, $5) RETURNING *", [randomUUID(), cardId, candidate.text, sortOrder, candidate.isRecommended]);
      saved.push(mapPhraseCandidate(result.rows[0]));
    }
    await client.query("COMMIT");
    return saved;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
};

export const setPublicSharePhraseRecommendations = async (cardId: string, recommendedIds: string[]) => {
  const result = await getPostgresPool().query<PhraseCandidateRow>(
    "UPDATE public_card_share_phrase_candidates SET is_recommended = id = ANY($2::uuid[]), updated_at = now() WHERE card_id = $1 RETURNING *",
    [cardId, recommendedIds]
  );
  return result.rows.map(mapPhraseCandidate).sort((left, right) => left.sortOrder - right.sortOrder);
};
