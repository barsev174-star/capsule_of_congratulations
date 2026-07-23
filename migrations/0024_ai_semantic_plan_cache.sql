CREATE TABLE IF NOT EXISTS ai_semantic_plan_cache (
  cache_key text PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  extractor_model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_semantic_plan_cache_card_expiry_idx ON ai_semantic_plan_cache(card_id, expires_at);
