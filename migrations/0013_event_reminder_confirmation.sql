ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;
