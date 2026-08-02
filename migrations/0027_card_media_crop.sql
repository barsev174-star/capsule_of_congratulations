ALTER TABLE card_media_assets
  ADD COLUMN IF NOT EXISTS image_width integer,
  ADD COLUMN IF NOT EXISTS image_height integer,
  ADD COLUMN IF NOT EXISTS crop_x double precision NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS crop_y double precision NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS crop_zoom double precision NOT NULL DEFAULT 1;

ALTER TABLE card_media_assets
  DROP CONSTRAINT IF EXISTS card_media_assets_crop_check;

ALTER TABLE card_media_assets
  ADD CONSTRAINT card_media_assets_crop_check CHECK (
    crop_x BETWEEN 0 AND 100 AND
    crop_y BETWEEN 0 AND 100 AND
    crop_zoom BETWEEN 1 AND 3 AND
    (image_width IS NULL OR image_width > 0) AND
    (image_height IS NULL OR image_height > 0)
  );
