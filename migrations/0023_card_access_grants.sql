CREATE TABLE IF NOT EXISTS card_access_grants (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  reason_code text NOT NULL CHECK (reason_code IN ('QA_TEST', 'COMPLIMENTARY', 'SUPPORT_COMPENSATION', 'PARTNER', 'PROMOTION', 'OTHER')),
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 3 AND 1000),
  granted_by_admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by_admin_id uuid REFERENCES admin_users(id) ON DELETE RESTRICT,
  revoke_comment text,
  superseded_at timestamptz,
  superseded_by_order_id uuid REFERENCES payment_orders(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS active_access_grant_id uuid;
ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_active_access_grant_id_fkey,
  ADD CONSTRAINT cards_active_access_grant_id_fkey
  FOREIGN KEY (active_access_grant_id) REFERENCES card_access_grants(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS card_access_grants_one_active_per_card_idx
  ON card_access_grants(card_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS card_access_grants_active_idx
  ON card_access_grants(card_id, expires_at) WHERE status = 'ACTIVE';
