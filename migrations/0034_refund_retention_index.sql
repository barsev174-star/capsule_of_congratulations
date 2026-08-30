-- Canceled refunds have no completed_at, but their raw provider payload must
-- still be sanitized after the retention window.

DROP INDEX IF EXISTS payment_refunds_payload_retention_idx;

CREATE INDEX payment_refunds_payload_retention_idx
  ON payment_refunds(COALESCE(completed_at, created_at))
  WHERE status IN ('SUCCEEDED', 'CANCELED') AND provider_payload IS NOT NULL;
