-- Explicit operator marking only: legacy and incomplete cards remain real data.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS cards_business_created_idx ON cards(created_at DESC) WHERE is_test = false;
CREATE INDEX IF NOT EXISTS event_reminders_created_idx ON event_reminders(created_at DESC, id);
CREATE INDEX IF NOT EXISTS event_reminders_event_date_idx ON event_reminders(event_date);
CREATE INDEX IF NOT EXISTS payment_attempts_created_idx ON payment_attempts(created_at DESC, id);
CREATE INDEX IF NOT EXISTS payment_orders_paid_at_idx ON payment_orders(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_refunds_completed_idx ON payment_refunds(completed_at) WHERE status = 'SUCCEEDED';
-- Complements card_audit_events for operations on non-card objects.
CREATE TABLE IF NOT EXISTS admin_action_events (
  id uuid PRIMARY KEY,
  actor_id text NOT NULL,
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  result text NOT NULL CHECK (result IN ('succeeded', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_action_events_object_idx ON admin_action_events(object_type, object_id, created_at DESC);
