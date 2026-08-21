import { logger } from "@/lib/logger";
import { sendCriticalAlert } from "./notifications";
import {
  claimCriticalAlerts,
  completeCriticalAlert,
  failCriticalAlert
} from "./repository";

type CriticalAlertBatchDependencies = {
  claim: typeof claimCriticalAlerts;
  send: typeof sendCriticalAlert;
  complete: typeof completeCriticalAlert;
  fail: typeof failCriticalAlert;
};

const defaultDependencies: CriticalAlertBatchDependencies = {
  claim: claimCriticalAlerts,
  send: sendCriticalAlert,
  complete: completeCriticalAlert,
  fail: failCriticalAlert
};

export const runCriticalAlertBatch = async (
  limit = 25,
  dependencies: CriticalAlertBatchDependencies = defaultDependencies
) => {
  const deliveries = await dependencies.claim(limit);
  let sent = 0;
  let failed = 0;
  for (const delivery of deliveries) {
    try {
      await dependencies.send(delivery);
      await dependencies.complete(delivery.id);
      sent += 1;
    } catch (error) {
      await dependencies.fail(delivery.id, error);
      failed += 1;
      logger.warn("critical_alert.delivery_failed", "Critical alert delivery failed", {
        deliveryId: delivery.id,
        errorId: delivery.errorId,
        channel: delivery.channel
      });
    }
  }
  logger.info("critical_alert.batch_complete", "Critical alert batch completed", {
    claimed: deliveries.length,
    sent,
    failed
  });
  return { claimed: deliveries.length, sent, failed };
};
