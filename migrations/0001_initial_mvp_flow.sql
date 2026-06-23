CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY,
  public_slug text NOT NULL UNIQUE,
  manage_token text NOT NULL UNIQUE,
  final_slug text NOT NULL UNIQUE,
  recipient_name text NOT NULL,
  occasion text NOT NULL,
  occasion_text text NOT NULL,
  from_label text NOT NULL,
  organizer_name text NOT NULL,
  organizer_email text NOT NULL,
  event_date date,
  description text,
  signature text,
  template_id text NOT NULL,
  final_block_settings jsonb,
  final_block_order jsonb,
  final_message_settings jsonb,
  final_main_greeting_settings jsonb,
  final_memory_settings jsonb,
  status text NOT NULL DEFAULT 'draft',
  payment_status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT cards_status_check CHECK (status IN ('draft', 'collecting', 'ready', 'closed')),
  CONSTRAINT cards_payment_status_check CHECK (payment_status IN ('unpaid'))
);

CREATE INDEX IF NOT EXISTS cards_status_idx ON cards(status);
CREATE INDEX IF NOT EXISTS cards_created_at_idx ON cards(created_at DESC);

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_role text,
  author_avatar_url text,
  message text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'visible',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT contributions_status_check CHECK (status IN ('visible', 'hidden', 'deleted')),
  CONSTRAINT contributions_source_check CHECK (source IN ('manual'))
);

CREATE INDEX IF NOT EXISTS contributions_card_order_idx ON contributions(card_id, sort_order, created_at);
CREATE INDEX IF NOT EXISTS contributions_card_status_idx ON contributions(card_id, status);

CREATE TABLE IF NOT EXISTS card_media_assets (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  slot text NOT NULL,
  public_url text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  caption_title text NOT NULL DEFAULT '',
  caption_subtitle text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT card_media_assets_slot_check CHECK (
    slot IN ('portrait', 'landscape-a', 'landscape-b', 'landscape-c', 'memory-a', 'memory-b', 'memory-c')
  ),
  CONSTRAINT card_media_assets_card_slot_unique UNIQUE (card_id, slot)
);

CREATE INDEX IF NOT EXISTS card_media_assets_card_created_idx ON card_media_assets(card_id, created_at);

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  generation_type text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_generation_logs_card_type_idx ON ai_generation_logs(card_id, generation_type);
