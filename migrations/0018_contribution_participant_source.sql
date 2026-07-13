-- Distinguish join-form participants from organizer-created manual entries.
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS contributions_source_check;

ALTER TABLE contributions
  ADD CONSTRAINT contributions_source_check CHECK (source IN ('manual', 'participant'));

-- Participant tokens were introduced before a dedicated source existed.
-- A token is created only by the participant join flow, so existing rows can be repaired safely.
UPDATE contributions
SET source = 'participant'
WHERE source = 'manual' AND participant_token_hash IS NOT NULL;
