ALTER TABLE event_reminders DROP CONSTRAINT IF EXISTS event_reminders_status_check;

ALTER TABLE event_reminders
  ADD CONSTRAINT event_reminders_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'cancelled'));
