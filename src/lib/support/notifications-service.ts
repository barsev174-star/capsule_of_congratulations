import { logger } from "@/lib/logger";
import { reportCriticalError } from "@/lib/telemetry";
import { sendSupportNotification } from "./notifications";
import {
  claimSupportNotifications,
  completeSupportNotification,
  failSupportNotification
} from "./notifications-repository";

type SupportNotificationBatchDependencies = {
  claim: typeof claimSupportNotifications;
  send: typeof sendSupportNotification;
  complete: typeof completeSupportNotification;
  fail: typeof failSupportNotification;
};

const defaultDependencies: SupportNotificationBatchDependencies = {
  claim: claimSupportNotifications,
  send: sendSupportNotification,
  complete: completeSupportNotification,
  fail: failSupportNotification
};

export const runSupportNotificationBatch = async (
  options: { limit?: number; requestId?: string; deliveryId?: string } = {},
  dependencies: SupportNotificationBatchDependencies = defaultDependencies
) => {
  const deliveries = await dependencies.claim(options);
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
      await reportCriticalError("email", error, {
        requestId: delivery.request.id,
        deliveryId: delivery.id,
        channel: delivery.channel,
        operation: "support_notification"
      });
    }
  }

  logger.info("support.notification_batch_complete", "Support notification batch completed", {
    claimed: deliveries.length,
    sent,
    failed
  });
  return { claimed: deliveries.length, sent, failed };
};
