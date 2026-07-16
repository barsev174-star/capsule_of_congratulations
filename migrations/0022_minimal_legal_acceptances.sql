ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS offer_version text,
  ADD COLUMN IF NOT EXISTS refund_rules_version text,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS offer_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

ALTER TABLE contributions
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz;

ALTER TABLE card_media_assets
  ADD COLUMN IF NOT EXISTS rights_consent_version text,
  ADD COLUMN IF NOT EXISTS rights_confirmed_at timestamptz;
