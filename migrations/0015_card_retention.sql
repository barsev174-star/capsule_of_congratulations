ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS purge_after timestamptz;

CREATE INDEX IF NOT EXISTS idx_cards_purge_after
  ON cards(purge_after)
  WHERE purge_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cards_unpublished_activity
  ON cards(updated_at)
  WHERE status <> 'published' AND deleted_at IS NULL;
