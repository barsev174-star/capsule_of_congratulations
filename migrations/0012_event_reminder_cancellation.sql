ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS cancel_token_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS event_reminders_cancel_token_hash_idx
  ON event_reminders(cancel_token_hash)
  WHERE cancel_token_hash IS NOT NULL;
