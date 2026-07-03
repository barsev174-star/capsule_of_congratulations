"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin/session";
import { updateSupportRequestStatus } from "@/lib/support/repository";
import type { SupportRequestStatus } from "@/lib/support/types";
import { logger } from "@/lib/logger";

const statuses: SupportRequestStatus[] = ["new", "in_progress", "resolved"];

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
