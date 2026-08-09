CREATE TABLE IF NOT EXISTS support_notification_deliveries (
  id uuid PRIMARY KEY,
  support_request_id uuid NOT NULL REFERENCES support_requests(id) ON DELETE CASCADE,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT support_notification_channel_check CHECK (channel IN ('email', 'telegram')),
  CONSTRAINT support_notification_status_check CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  CONSTRAINT support_notification_attempt_count_check CHECK (attempt_count >= 0 AND attempt_count <= 5),
  CONSTRAINT support_notification_request_channel_unique UNIQUE (support_request_id, channel)
);

CREATE INDEX IF NOT EXISTS support_notification_due_idx
  ON support_notification_deliveries(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS support_notification_request_idx
  ON support_notification_deliveries(support_request_id, created_at);
