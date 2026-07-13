ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS participant_token_hash text;

CREATE TABLE IF NOT EXISTS gift_polls (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'gift',
  title text NOT NULL,
  question text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  closes_at timestamptz,
  selected_option_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_polls_mode_check CHECK (mode IN ('gift', 'budget')),
  CONSTRAINT gift_polls_status_check CHECK (status IN ('draft', 'open', 'closed', 'deleted'))
);

CREATE TABLE IF NOT EXISTS gift_poll_options (
  id uuid PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES gift_polls(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  price_label text,
  product_url text,
  sort_order integer NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_poll_options_title_length CHECK (char_length(title) BETWEEN 1 AND 60),
  CONSTRAINT gift_poll_options_description_length CHECK (description IS NULL OR char_length(description) <= 140),
  CONSTRAINT gift_poll_options_price_length CHECK (price_label IS NULL OR char_length(price_label) <= 30)
);

CREATE INDEX IF NOT EXISTS gift_poll_options_poll_order_idx
  ON gift_poll_options(poll_id, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS gift_votes (
  id uuid PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES gift_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES gift_poll_options(id) ON DELETE RESTRICT,
  greeting_id uuid NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  participant_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_votes_poll_participant_unique UNIQUE (poll_id, participant_token_hash)
);

CREATE INDEX IF NOT EXISTS gift_votes_poll_option_idx ON gift_votes(poll_id, option_id);
