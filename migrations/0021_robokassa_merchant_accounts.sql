CREATE TABLE IF NOT EXISTS merchant_accounts (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider = 'ROBOKASSA'),
  merchant_login text NOT NULL,
  secret_reference text NOT NULL,
  seller_full_name text NOT NULL,
  seller_inn text NOT NULL,
  seller_tax_status text NOT NULL CHECK (seller_tax_status = 'SELF_EMPLOYED'),
  status text NOT NULL CHECK (status IN ('TEST', 'ACTIVE', 'RETIRED')),
  active_from timestamptz,
  active_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_accounts_provider_login_unique UNIQUE (provider, merchant_login)
);

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS merchant_account_id uuid REFERENCES merchant_accounts(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS seller_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS provider_invoice_id bigint,
  ADD COLUMN IF NOT EXISTS receipt_email text,
  ADD COLUMN IF NOT EXISTS receipt jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_account_invoice_unique
  ON payment_orders(provider, merchant_account_id, provider_invoice_id)
  WHERE merchant_account_id IS NOT NULL AND provider_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_merchant_account_idx ON payment_orders(merchant_account_id);
