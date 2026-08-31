ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS gift_animation_id text NOT NULL DEFAULT 'envelope';

ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_gift_animation_id_check;

ALTER TABLE cards
  ADD CONSTRAINT cards_gift_animation_id_check
  CHECK (gift_animation_id IN ('envelope', 'collect-messages'));
