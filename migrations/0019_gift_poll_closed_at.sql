ALTER TABLE gift_polls
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

UPDATE gift_polls
SET closed_at = updated_at
WHERE status = 'closed' AND closed_at IS NULL;
