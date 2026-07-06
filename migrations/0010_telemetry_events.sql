CREATE TABLE IF NOT EXISTS telemetry_events (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('funnel', 'critical', 'client_error')),
  event text NOT NULL,
  card_id text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telemetry_events_created_at_idx ON telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_event_created_at_idx ON telemetry_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_card_id_idx ON telemetry_events(card_id) WHERE card_id IS NOT NULL;
