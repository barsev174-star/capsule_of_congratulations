# Scrapbook rework plan, 2026-06-21

Актуальный статус после завершения первичного scrapbook-дизайна см. в `docs/PROJECT_HANDOFF_2026-06-23.md`. Этот файл остается историческим планом визуальной переработки.

## Baseline

The current scrapbook card state is being fixed as a rollback point before the next visual and product rework.

Included in the baseline:

1. Current tuned scrapbook decor config from the latest copied debug panel values.
2. Current greeting, quote, paper, and message-grid visual fixes.
3. Newly provided scrapbook source assets for the next iteration.

Temporary screenshot outputs are not part of the baseline.

## Assessment

The current card already has the right direction: warm paper texture, live text, configurable visual assets, and a debug panel that can tune the template without hardcoding every decoration.

The next change is larger than a visual polish pass because it touches both content structure and editor behavior:

1. The old summary block should become a required selected greeting block.
2. The organizer needs a way to choose the main greeting and optionally generate it with AI.
3. The qualities block should become gender-neutral and read as an AI extraction from messages.
4. The hero, memories, and closing blocks need a more premium scrapbook composition.
5. New decorative assets should be added through the config-driven system, not as one-off CSS where possible.

## Implementation Plan

### 1. Preserve current state

1. Commit the current visual config, current template assets, and message-grid fixes.
2. Keep this commit as the restore point if the new direction does not land well.

### 2. Asset registration

1. Add the new assets to the scrapbook visual system:
   - `Фотик`;
   - `цветок 1`;
   - `цветок 2`;
   - `Цветок большой`;
   - future `Цветок 3` - `Цветок 7`;
   - `Полароид`;
   - `Качества ...` paper cards.
2. Use `greeting-card-grid.png` as the lavender greeting-card variant in the congratulations block.
3. Prefer config-driven placement for decorative assets so the debug panel can keep tuning them.

### 3. Main Greeting block

1. Rename the editor concept to `Главное поздравление`.
2. Show it on the card as `Самые важные слова`.
3. Allow up to 500 characters.
4. Make the block required for this template.
5. Let the organizer choose one existing greeting for this block.
6. Let the organizer create or improve the main greeting with AI from the `Поздравления и фото` tab.
7. In `Оформление открытки`, show status and a clear hint explaining how to fill the block.
8. Keep the block freely movable in the card structure.

### 4. Hero redesign

1. Make the recipient name the central visual focus.
2. Reduce decorative noise around the name.
3. Keep edge photos, but align them more deliberately using the transparent `Полароид` asset.
4. Make the CTA more premium.
5. Make the greeting-count block softer but more noticeable.
6. Use the supplied reference as the visual direction: more air, cleaner hierarchy, warmer premium scrapbook feel.

### 5. Qualities redesign

1. Rename the block to `За что тебя ценят`.
2. Change subtitle to `Собрано из поздравлений`.
3. Use nouns instead of adjectives: `доброта`, `забота`, `надежность`, `вдохновение`, `поддержка`, `тепло`, `юмор`, `искренность`, `энергия`, `мудрость`.
4. Make the block feel like an AI summary of recurring themes in the greetings.
5. Render qualities on the new transparent `Качества ...` paper assets.

### 6. Memories redesign

1. Make the first photo larger.
2. Move toward a more album-like composition.
3. Unify photo captions and frames.
4. Add a light decorative accent without crowding the block.

### 7. Closing redesign

1. Make the final block cleaner and warmer.
2. Improve the `Создать такую же открытку` CTA.
3. Add a final floral accent.

## Verification

For each phase:

1. Run automated tests.
2. Capture desktop and mobile screenshots.
3. Check the public card with and without `debugAssets=1`.
4. Avoid breaking existing `Колонка + фото` layout while reworking other greeting layouts.
