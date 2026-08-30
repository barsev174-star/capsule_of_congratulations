ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz;

ALTER TABLE public_card_shares
  ADD COLUMN IF NOT EXISTS publication_confirmation_version text,
  ADD COLUMN IF NOT EXISTS publication_confirmation_accepted_at timestamptz;
