CREATE TABLE IF NOT EXISTS ai_usage_events (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  generation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT ai_usage_events_status_check CHECK (status IN ('pending', 'succeeded'))
);

CREATE INDEX IF NOT EXISTS ai_usage_events_card_type_idx
  ON ai_usage_events(card_id, generation_type, status);

CREATE TABLE IF NOT EXISTS ai_generation_drafts (
  id uuid PRIMARY KEY REFERENCES ai_usage_events(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generation_drafts_card_idx
  ON ai_generation_drafts(card_id, created_at);

INSERT INTO ai_usage_events (id, card_id, generation_type, status, provider, model, created_at, completed_at)
SELECT id, card_id, generation_type, 'succeeded', 'mock', 'local-template-v5', created_at, created_at
FROM ai_generation_logs
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_generation_drafts (id, card_id, input, output, created_at)
SELECT id, card_id, input, output, created_at
FROM ai_generation_logs
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS ai_generation_logs;
