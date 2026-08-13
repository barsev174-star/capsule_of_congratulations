ALTER TABLE public_card_shares
  ADD COLUMN IF NOT EXISTS show_event_date boolean NOT NULL DEFAULT true;

ALTER TABLE public_card_shares
  DROP CONSTRAINT IF EXISTS public_card_shares_payload_version_check;

ALTER TABLE public_card_shares
  ADD CONSTRAINT public_card_shares_payload_version_check CHECK (payload_version IN (1, 2));
