-- New Slovesto lifecycle. Existing user data is intentionally cleaned by the
-- prelaunch cleanup procedure before this migration is applied in production.

ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_status_check,
  DROP CONSTRAINT IF EXISTS cards_payment_status_check;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS collection_status text NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'PREPARING',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS collection_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS collection_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_first_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS purged_at timestamptz,
  ADD COLUMN IF NOT EXISTS active_paid_order_id uuid,
  ADD COLUMN IF NOT EXISTS repurchase_allowed_at timestamptz,
  ADD COLUMN IF NOT EXISTS repurchase_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS repurchase_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS repurchase_allowed_by_admin_id uuid;

ALTER TABLE cards
  ALTER COLUMN payment_status SET DEFAULT 'UNPAID';

UPDATE cards
SET payment_status = CASE
  WHEN payment_status = 'paid' THEN 'PAID'
  ELSE 'UNPAID'
END;

ALTER TABLE cards
  ADD CONSTRAINT cards_payment_status_check
  CHECK (payment_status IN ('UNPAID', 'PAID', 'REFUNDED', 'REVOKED')),
  ADD CONSTRAINT cards_collection_status_check
  CHECK (collection_status IN ('DRAFT', 'OPEN', 'CLOSED')),
  ADD CONSTRAINT cards_delivery_status_check
  CHECK (delivery_status IN ('PREPARING', 'DELIVERED'));

-- A purged tombstone must not retain personal content or public identifiers.
ALTER TABLE cards
  ALTER COLUMN public_slug DROP NOT NULL,
  ALTER COLUMN manage_token DROP NOT NULL,
  ALTER COLUMN final_slug DROP NOT NULL,
  ALTER COLUMN recipient_name DROP NOT NULL,
  ALTER COLUMN occasion DROP NOT NULL,
  ALTER COLUMN occasion_text DROP NOT NULL,
  ALTER COLUMN from_label DROP NOT NULL,
  ALTER COLUMN organizer_name DROP NOT NULL,
  ALTER COLUMN organizer_email DROP NOT NULL,
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE cards
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS purge_after;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS purge_at timestamptz;

CREATE INDEX IF NOT EXISTS cards_collection_status_idx ON cards(collection_status);
CREATE INDEX IF NOT EXISTS cards_delivery_status_idx ON cards(delivery_status);
CREATE INDEX IF NOT EXISTS cards_purge_at_idx ON cards(purge_at) WHERE purge_at IS NOT NULL AND purged_at IS NULL;

-- The existing placeholder order table becomes an immutable sale record.
ALTER TABLE payment_orders
  DROP CONSTRAINT IF EXISTS payment_orders_status_check,
  DROP CONSTRAINT IF EXISTS payment_orders_card_id_fkey;

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS product_code text NOT NULL DEFAULT 'final-card-v1',
  ADD COLUMN IF NOT EXISTS list_amount integer NOT NULL DEFAULT 39900,
  ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payable_amount integer NOT NULL DEFAULT 39900,
  ADD COLUMN IF NOT EXISTS price_version text NOT NULL DEFAULT 'final-card-v1',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_refunded_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason_code text,
  ADD COLUMN IF NOT EXISTS revoked_comment text,
  ADD COLUMN IF NOT EXISTS revoked_by_admin_id uuid;

UPDATE payment_orders
SET status = CASE status
  WHEN 'paid' THEN 'PAID'
  WHEN 'refunded' THEN 'REFUNDED'
  WHEN 'failed' THEN 'CANCELED'
  ELSE 'CREATED'
END;

ALTER TABLE payment_orders
  ALTER COLUMN status SET DEFAULT 'CREATED',
  ADD CONSTRAINT payment_orders_status_check
  CHECK (status IN ('CREATED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELED', 'REVOKED')),
  ADD CONSTRAINT payment_orders_card_id_fkey
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_payment_id text,
  status text NOT NULL DEFAULT 'PENDING',
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  confirmation_url text,
  idempotency_key text NOT NULL,
  provider_payload jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_attempts_status_check CHECK (status IN ('PENDING', 'SUCCEEDED', 'CANCELED', 'EXPIRED')),
  CONSTRAINT payment_attempts_provider_payment_unique UNIQUE (provider, provider_payment_id),
  CONSTRAINT payment_attempts_idempotency_unique UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_one_pending_order_idx
  ON payment_attempts(order_id) WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS payment_refunds (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  provider_refund_id text,
  amount integer NOT NULL,
  status text NOT NULL,
  reason text,
  provider_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT payment_refunds_provider_refund_unique UNIQUE (provider_refund_id)
);

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES payment_orders(id) ON DELETE RESTRICT,
  attempt_id uuid REFERENCES payment_attempts(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_event_id text,
  event_type text NOT NULL,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT payment_events_provider_event_unique UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS payment_revocations (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES payment_orders(id) ON DELETE RESTRICT,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  reason_code text NOT NULL CHECK (reason_code IN ('CHARGEBACK', 'PROVIDER_REVERSAL', 'FRAUD', 'ERRONEOUS_ENTITLEMENT', 'OTHER')),
  comment text NOT NULL,
  evidence_reference text,
  created_by_admin_id uuid REFERENCES admin_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards
  ADD CONSTRAINT cards_active_paid_order_id_fkey
  FOREIGN KEY (active_paid_order_id) REFERENCES payment_orders(id) ON DELETE RESTRICT,
  ADD CONSTRAINT cards_repurchase_allowed_by_admin_id_fkey
  FOREIGN KEY (repurchase_allowed_by_admin_id) REFERENCES admin_users(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS card_audit_events (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  actor_type text NOT NULL,
  actor_id text,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS card_audit_events_card_created_idx ON card_audit_events(card_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- The old publication gate must disappear with the lifecycle migration.
DROP INDEX IF EXISTS idx_cards_unpublished_activity;
