"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashAdminPassword } from "@/lib/admin/auth";
import { requireAdminRole } from "@/lib/admin/session";
import {
  createAdminUser,
  createPaymentOrder,
  deleteAdminUser,
  toggleTemplateOverride,
  updateAdminUserRole,
  updatePaymentOrderStatus,
  upsertTemplateOverride
} from "@/lib/admin/repository-phase2";
import type { AdminUserRole, PaymentOrderStatus, TemplateOverride } from "@/lib/admin/types";
import { logger } from "@/lib/logger";

const paymentOrderStatuses: PaymentOrderStatus[] = ["pending", "paid", "failed", "refunded"];
const adminRoles: AdminUserRole[] = ["admin", "moderator", "support"];

export async function updatePaymentOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as PaymentOrderStatus;

  if (!orderId || !paymentOrderStatuses.includes(status)) {
    return;
  }

  const updated = await updatePaymentOrderStatus(orderId, status);

  if (updated) {
    logger.info("admin.payment_order_status_updated", "Payment order status updated", {
      orderId: updated.id,
      status
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function createPaymentOrderAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const cardId = String(formData.get("cardId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);

  if (!cardId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const order = await createPaymentOrder({ cardId, amount });
  logger.info("admin.payment_order_created", "Payment order created", { orderId: order.id, cardId, amount });

  revalidatePath("/admin/orders");
}

export async function upsertTemplateOverrideAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const accent = String(formData.get("accent") ?? "").trim() || null;
  const recommendedForRaw = String(formData.get("recommendedFor") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") === "on";

  const recommendedFor: TemplateOverride["recommendedFor"] =
    recommendedForRaw.length > 0
      ? recommendedForRaw.split(",").map((value) => value.trim()) as TemplateOverride["recommendedFor"]
      : null;

  if (!id) {
    return;
  }

  const override: TemplateOverride = {
    id,
    name,
    description,
    accent,
    recommendedFor,
    isActive,
    updatedAt: new Date().toISOString()
  };

  await upsertTemplateOverride(override);
  logger.info("admin.template_override_updated", "Template override updated", { templateId: id, isActive });

  revalidatePath("/admin/templates");
}

export async function toggleTemplateOverrideAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";

  if (!id) {
    return;
  }

  await toggleTemplateOverride(id, isActive);
  logger.info("admin.template_override_toggled", "Template override toggled", { templateId: id, isActive });

  revalidatePath("/admin/templates");
}

export async function createAdminUserAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as AdminUserRole;

  if (!email || !password || password.length < 8 || !adminRoles.includes(role)) {
    return;
  }

  const { salt, hash } = generateAdminPasswordInline(password);

  await createAdminUser({ email, passwordHash: hash, passwordSalt: salt, role });
  logger.info("admin.user_created", "Admin user created", { email, role });

  revalidatePath("/admin/users");
}

export async function updateAdminUserRoleAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as AdminUserRole;

  if (!userId || !adminRoles.includes(role)) {
    return;
  }

  const updated = await updateAdminUserRole(userId, role);

  if (updated) {
    logger.info("admin.user_role_updated", "Admin user role updated", { userId: updated.id, role });
  }

  revalidatePath("/admin/users");
}

export async function deleteAdminUserAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");

  const userId = String(formData.get("userId") ?? "");

  if (!userId) {
    return;
  }

  const deleted = await deleteAdminUser(userId);

  if (deleted) {
    logger.info("admin.user_deleted", "Admin user deleted", { userId: deleted.id });
  }

  revalidatePath("/admin/users");
}

function generateAdminPasswordInline(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = hashAdminPassword(password, salt);
  return { salt, hash };
}
