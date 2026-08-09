CREATE TABLE IF NOT EXISTS ai_card_quote_selections (
  card_id uuid PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  items jsonb NOT NULL,
  source_fingerprint text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_card_quote_selections_items_array_check CHECK (jsonb_typeof(items) = 'array')
);
