-- Support the operator retention schedule without full-table scans.

CREATE INDEX IF NOT EXISTS cards_delivered_retention_idx
  ON cards(delivered_at, recipient_first_opened_at)
  WHERE deleted_at IS NULL AND purged_at IS NULL AND delivery_status = 'DELIVERED';

CREATE INDEX IF NOT EXISTS organizer_magic_links_used_idx
  ON organizer_magic_links(used_at)
  WHERE used_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS event_reminders_terminal_retention_idx
  ON event_reminders(updated_at)
  WHERE status IN ('sent', 'cancelled', 'failed');

CREATE INDEX IF NOT EXISTS support_requests_retention_idx
  ON support_requests(status, updated_at);

CREATE INDEX IF NOT EXISTS support_notification_terminal_retention_idx
  ON support_notification_deliveries(updated_at)
  WHERE status IN ('sent', 'failed');

CREATE INDEX IF NOT EXISTS telemetry_events_kind_retention_idx
  ON telemetry_events(kind, created_at);

CREATE INDEX IF NOT EXISTS critical_alert_terminal_retention_idx
  ON critical_alert_deliveries(updated_at)
  WHERE status IN ('sent', 'failed');

CREATE INDEX IF NOT EXISTS payment_attempts_payload_retention_idx
  ON payment_attempts(updated_at)
  WHERE status IN ('SUCCEEDED', 'CANCELED', 'EXPIRED')
    AND (provider_payload IS NOT NULL OR confirmation_url IS NOT NULL);

CREATE INDEX IF NOT EXISTS payment_refunds_payload_retention_idx
  ON payment_refunds(completed_at)
  WHERE completed_at IS NOT NULL AND provider_payload IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_events_payload_retention_idx
  ON payment_events(processed_at)
  WHERE processed_at IS NOT NULL AND payload IS NOT NULL;
