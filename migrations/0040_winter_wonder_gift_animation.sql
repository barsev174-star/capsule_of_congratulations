ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_gift_animation_id_check,
  DROP CONSTRAINT IF EXISTS cards_winter_wonder_template_check,
  ADD CONSTRAINT cards_gift_animation_id_check
    CHECK (gift_animation_id IN ('envelope', 'collect-messages', 'winter-wonder')),
  ADD CONSTRAINT cards_winter_wonder_template_check
    CHECK (gift_animation_id <> 'winter-wonder' OR template_id IS NOT DISTINCT FROM 'new-year');
