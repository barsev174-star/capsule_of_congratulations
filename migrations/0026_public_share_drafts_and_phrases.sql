ALTER TABLE public_card_shares
  DROP CONSTRAINT IF EXISTS public_card_shares_status_check;

ALTER TABLE public_card_shares
  ALTER COLUMN token_hash DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS show_public_name boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_phrase_candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revoked_by text;

ALTER TABLE public_card_shares
  ADD CONSTRAINT public_card_shares_status_check CHECK (status IN ('DRAFT', 'ACTIVE', 'REVOKED'));

CREATE UNIQUE INDEX IF NOT EXISTS public_card_shares_one_draft_per_card_idx
  ON public_card_shares(card_id) WHERE status = 'DRAFT';

CREATE TABLE IF NOT EXISTS public_card_share_phrase_candidates (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 180),
  sort_order integer NOT NULL,
  is_recommended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_card_share_phrase_candidates_card_order_unique UNIQUE (card_id, sort_order)
);

CREATE INDEX IF NOT EXISTS public_card_share_phrase_candidates_card_idx
  ON public_card_share_phrase_candidates(card_id, sort_order);
