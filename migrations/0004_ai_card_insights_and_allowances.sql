CREATE TABLE IF NOT EXISTS ai_card_insights (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  items jsonb NOT NULL,
  source_fingerprint text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, insight_type),
  CONSTRAINT ai_card_insights_type_check CHECK (insight_type IN ('quotes', 'qualities'))
);

CREATE TABLE IF NOT EXISTS ai_card_allowances (
  card_id uuid PRIMARY KEY REFERENCES cards(id) ON DELETE CASCADE,
  bonus_limit integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_card_allowances_bonus_check CHECK (bonus_limit BETWEEN 0 AND 1000)
);
