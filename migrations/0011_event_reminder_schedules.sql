ALTER TABLE event_reminders
  ALTER COLUMN remind_on DROP NOT NULL;

ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS schedule text NOT NULL DEFAULT 'seven_days_before';

ALTER TABLE event_reminders
  DROP CONSTRAINT IF EXISTS event_reminders_schedule_check;

ALTER TABLE event_reminders
  ADD CONSTRAINT event_reminders_schedule_check
  CHECK (schedule IN ('seven_days_before', 'next_day', 'confirmation_only'));

ALTER TABLE event_reminders
  ADD CONSTRAINT event_reminders_schedule_date_check
  CHECK (
    (schedule = 'confirmation_only' AND remind_on IS NULL)
    OR (schedule <> 'confirmation_only' AND remind_on IS NOT NULL)
  );
