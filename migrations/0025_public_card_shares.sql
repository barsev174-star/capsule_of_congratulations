CREATE TABLE IF NOT EXISTS public_card_shares (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  payload_version integer NOT NULL DEFAULT 1 CHECK (payload_version = 1),
  display_name text,
  headline_preset text NOT NULL DEFAULT 'GIFTED_CARD'
    CHECK (headline_preset IN ('GIFTED_CARD', 'THANK_YOU', 'LOOK_WHAT_I_GOT')),
  show_occasion boolean NOT NULL DEFAULT true,
  show_greeting_count boolean NOT NULL DEFAULT true,
  show_photo_count boolean NOT NULL DEFAULT true,
  public_summary text,
  public_qualities jsonb NOT NULL DEFAULT '[]'::jsonb,
  public_phrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  photo_consent_version text,
  photo_consent_accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS public_card_shares_one_active_per_card_idx
  ON public_card_shares(card_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS public_card_shares_card_idx ON public_card_shares(card_id);

CREATE TABLE IF NOT EXISTS public_card_share_photos (
  id uuid PRIMARY KEY,
  public_share_id uuid NOT NULL REFERENCES public_card_shares(id) ON DELETE CASCADE,
  card_media_asset_id uuid NOT NULL REFERENCES card_media_assets(id) ON DELETE RESTRICT,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  sort_order integer NOT NULL,
  public_caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_card_share_photos_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT public_card_share_photos_share_asset_unique UNIQUE (public_share_id, card_media_asset_id),
  CONSTRAINT public_card_share_photos_share_order_unique UNIQUE (public_share_id, sort_order)
);

CREATE INDEX IF NOT EXISTS public_card_share_photos_share_order_idx
  ON public_card_share_photos(public_share_id, sort_order);
