import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";

const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const yearsBefore = (now: Date, years: number) => {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return cutoff;
};

export type SecondaryRetentionResult = {
  semanticPlans: number;
  magicLinks: number;
  reminders: number;
  supportDeliveries: number;
  supportRequests: number;
  telemetry: number;
  criticalAlerts: number;
  paymentAttemptsSanitized: number;
  paymentRefundsSanitized: number;
  paymentEventsSanitized: number;
};

const emptyResult = (): SecondaryRetentionResult => ({
  semanticPlans: 0,
  magicLinks: 0,
  reminders: 0,
  supportDeliveries: 0,
  supportRequests: 0,
  telemetry: 0,
  criticalAlerts: 0,
  paymentAttemptsSanitized: 0,
  paymentRefundsSanitized: 0,
  paymentEventsSanitized: 0
});

export const purgeSecondaryRetentionData = async (now = new Date()): Promise<SecondaryRetentionResult> => {
  if (!isPostgresConfigured()) return emptyResult();

  const cutoff30Days = daysBefore(now, 30);
  const cutoff90Days = daysBefore(now, 90);
  const cutoffOneYear = yearsBefore(now, 1);
  const cutoffTwoYears = yearsBefore(now, 2);
  const result = emptyResult();
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");

    const semanticPlans = await client.query(
      "DELETE FROM ai_semantic_plan_cache WHERE expires_at < $1",
      [now]
    );
    result.semanticPlans = semanticPlans.rowCount ?? 0;

    const magicLinks = await client.query(
      `DELETE FROM organizer_magic_links
       WHERE expires_at < $1 OR (used_at IS NOT NULL AND used_at < $1)`,
      [cutoff30Days]
    );
    result.magicLinks = magicLinks.rowCount ?? 0;

    const reminders = await client.query(
      `DELETE FROM event_reminders
       WHERE status IN ('sent', 'cancelled', 'failed')
         AND COALESCE(sent_at, cancelled_at, updated_at) < $1`,
      [cutoff90Days]
    );
    result.reminders = reminders.rowCount ?? 0;

    const supportDeliveries = await client.query(
      `DELETE FROM support_notification_deliveries
       WHERE status IN ('sent', 'failed')
         AND updated_at < $1`,
      [cutoff90Days]
    );
    result.supportDeliveries = supportDeliveries.rowCount ?? 0;

    const supportRequests = await client.query(
      `DELETE FROM support_requests
       WHERE (status = 'resolved' AND updated_at < $1)
          OR updated_at < $2`,
      [cutoffOneYear, cutoffTwoYears]
    );
    result.supportRequests = supportRequests.rowCount ?? 0;

    const telemetry = await client.query(
      `DELETE FROM telemetry_events
       WHERE (kind IN ('funnel', 'client_error') AND created_at < $1)
          OR (kind = 'critical' AND created_at < $2)`,
      [cutoff90Days, cutoffOneYear]
    );
    result.telemetry = telemetry.rowCount ?? 0;

    const criticalAlerts = await client.query(
      `DELETE FROM critical_alert_deliveries
       WHERE status IN ('sent', 'failed')
         AND updated_at < $1`,
      [cutoffOneYear]
    );
    result.criticalAlerts = criticalAlerts.rowCount ?? 0;

    const paymentAttempts = await client.query(
      `UPDATE payment_attempts
       SET provider_payload = NULL,
           confirmation_url = NULL
       WHERE status IN ('SUCCEEDED', 'CANCELED', 'EXPIRED')
         AND updated_at < $1
         AND (provider_payload IS NOT NULL OR confirmation_url IS NOT NULL)`,
      [cutoff90Days]
    );
    result.paymentAttemptsSanitized = paymentAttempts.rowCount ?? 0;

    const paymentRefunds = await client.query(
      `UPDATE payment_refunds
       SET provider_payload = NULL
       WHERE status IN ('SUCCEEDED', 'CANCELED')
         AND COALESCE(completed_at, created_at) < $1
         AND provider_payload IS NOT NULL`,
      [cutoff90Days]
    );
    result.paymentRefundsSanitized = paymentRefunds.rowCount ?? 0;

    const paymentEvents = await client.query(
      `UPDATE payment_events
       SET payload = NULL
       WHERE processed_at IS NOT NULL
         AND processed_at < $1
         AND payload IS NOT NULL`,
      [cutoff90Days]
    );
    result.paymentEventsSanitized = paymentEvents.rowCount ?? 0;

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
