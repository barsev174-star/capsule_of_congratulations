ALTER TABLE organizer_magic_links
  ADD COLUMN IF NOT EXISTS return_path text,
  ADD COLUMN IF NOT EXISTS claim_card_id uuid REFERENCES cards(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS transfer_card_id uuid REFERENCES cards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS organizer_magic_links_claim_card_idx
  ON organizer_magic_links(claim_card_id)
  WHERE claim_card_id IS NOT NULL AND used_at IS NULL;

CREATE INDEX IF NOT EXISTS organizer_magic_links_transfer_card_idx
  ON organizer_magic_links(transfer_card_id)
  WHERE transfer_card_id IS NOT NULL AND used_at IS NULL;
