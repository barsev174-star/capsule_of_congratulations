ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS is_reserved_free boolean NOT NULL DEFAULT false;

WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY card_id, generation_type
      ORDER BY created_at ASC, id ASC
    ) AS position
  FROM ai_usage_events
  WHERE status = 'succeeded'
    AND generation_type IN ('best_quotes', 'qualities')
)
UPDATE ai_usage_events AS usage
SET is_reserved_free = true
FROM ranked
WHERE usage.id = ranked.id
  AND ranked.position = 1;

CREATE INDEX IF NOT EXISTS ai_usage_events_card_chargeable_idx
  ON ai_usage_events(card_id, is_reserved_free, status);
