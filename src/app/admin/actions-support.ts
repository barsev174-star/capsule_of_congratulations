"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin/session";
import { updateSupportRequestStatus } from "@/lib/support/repository";
import { retrySupportNotification } from "@/lib/support/notifications-repository";
import { runSupportNotificationBatch } from "@/lib/support/notifications-service";
import type { SupportRequestStatus } from "@/lib/support/types";
import { logger } from "@/lib/logger";

const statuses: SupportRequestStatus[] = ["new", "in_progress", "resolved"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function updateSupportRequestStatusAction(formData: FormData): Promise<void> {
  await requireAdminRole("support");
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "") as SupportRequestStatus;

  if (!requestId || !statuses.includes(status)) return;

  const updated = await updateSupportRequestStatus(requestId, status);
  if (updated) {
    logger.info("admin.support_status_updated", "Support request status updated", {
      requestId,
      status
    });
  }
  revalidatePath("/admin/support");
}

export async function retrySupportNotificationAction(formData: FormData): Promise<void> {
  await requireAdminRole("support");
  const deliveryId = String(formData.get("deliveryId") ?? "");
  if (!uuidPattern.test(deliveryId) || !await retrySupportNotification(deliveryId)) return;

  await runSupportNotificationBatch({ deliveryId, limit: 1 });
  logger.info("admin.support_notification_retried", "Support notification retried", { deliveryId });
  revalidatePath("/admin/support");
}
