CREATE TABLE IF NOT EXISTS event_reminders (
  id uuid PRIMARY KEY,
  recipient_name text NOT NULL,
  occasion_text text NOT NULL,
  event_date date NOT NULL,
  remind_on date NOT NULL,
  email text NOT NULL,
  source_card_id uuid REFERENCES cards(id) ON DELETE SET NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT event_reminders_status_check CHECK (status IN ('pending', 'sent', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS event_reminders_pending_date_idx
  ON event_reminders(status, remind_on);

CREATE INDEX IF NOT EXISTS event_reminders_email_created_idx
  ON event_reminders(email, created_at DESC);
