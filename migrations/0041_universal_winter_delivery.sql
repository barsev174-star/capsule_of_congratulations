ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_winter_wonder_template_check,
  ALTER COLUMN gift_animation_id DROP NOT NULL;

COMMENT ON COLUMN cards.gift_animation_id IS
  'NULL is reserved for a new draft awaiting its first template selection.';
