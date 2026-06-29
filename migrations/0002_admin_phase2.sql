CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'RUB',
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_order_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT payment_orders_status_check CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS payment_orders_card_idx ON payment_orders(card_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders(status);

CREATE TABLE IF NOT EXISTS template_overrides (
  id text PRIMARY KEY,
  name text,
  description text,
  accent text,
  recommended_for jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'moderator', 'support'))
);

CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
