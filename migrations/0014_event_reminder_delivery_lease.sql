ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE event_reminders DROP CONSTRAINT IF EXISTS event_reminders_status_check;

ALTER TABLE event_reminders
  ADD CONSTRAINT event_reminders_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'cancelled', 'failed'));

ALTER TABLE event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_attempt_count_check;

ALTER TABLE event_reminders
  ADD CONSTRAINT event_reminders_attempt_count_check
  CHECK (attempt_count >= 0 AND attempt_count <= 5);
