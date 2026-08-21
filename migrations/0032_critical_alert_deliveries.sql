CREATE TABLE IF NOT EXISTS critical_alert_deliveries (
  id uuid PRIMARY KEY,
  error_id uuid NOT NULL,
  event text NOT NULL,
  fingerprint text NOT NULL,
  channel text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT critical_alert_channel_check CHECK (channel IN ('email', 'telegram')),
  CONSTRAINT critical_alert_status_check CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  CONSTRAINT critical_alert_attempt_count_check CHECK (attempt_count >= 0 AND attempt_count <= 5),
  CONSTRAINT critical_alert_error_channel_unique UNIQUE (error_id, channel)
);

CREATE INDEX IF NOT EXISTS critical_alert_due_idx
  ON critical_alert_deliveries(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS critical_alert_fingerprint_idx
  ON critical_alert_deliveries(fingerprint, channel, created_at DESC);
