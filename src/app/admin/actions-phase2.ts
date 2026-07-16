"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { hashAdminPassword } from "@/lib/admin/auth";
import { requireAdminRole } from "@/lib/admin/session";
import {
  createAdminUser,
  deleteAdminUser,
  toggleTemplateOverride,
  updateAdminUserRole,
  upsertTemplateOverride
} from "@/lib/admin/repository-phase2";
import type { AdminUserRole, TemplateOverride } from "@/lib/admin/types";
import { logger } from "@/lib/logger";
import { grantRepurchase, isRevocationReason, revokePaymentOrder } from "@/lib/payments/admin";
import { requestRobokassaFullRefund, syncRobokassaRefund } from "@/lib/payments/repository";
import { createMerchantAccount } from "@/lib/payments/merchant-accounts";

const adminRoles: AdminUserRole[] = ["admin", "moderator", "support"];

export async function revokePaymentOrderAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole("admin");
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!orderId || !comment || !isRevocationReason(reason)) return;
  await revokePaymentOrder({ orderId, adminEmail: session.email, reason, comment });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function grantRepurchaseAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole("admin");
  const cardId = String(formData.get("cardId") ?? "");
  if (!cardId) return;
  await grantRepurchase({ cardId, adminEmail: session.email });
  revalidatePath("/admin/orders");
}

export async function requestRobokassaRefundAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId || !reason) return;
  await requestRobokassaFullRefund(orderId, reason);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function syncRobokassaRefundAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;
  await syncRobokassaRefund(requestId);
  revalidatePath("/admin/orders");
}

export async function createMerchantAccountAction(formData: FormData): Promise<void> {
  await requireAdminRole("admin");
  const merchantLogin = String(formData.get("merchantLogin") ?? "").trim();
  const secretReference = String(formData.get("secretReference") ?? "").trim();
  const sellerFullName = String(formData.get("sellerFullName") ?? "").trim();
  const sellerInn = String(formData.get("sellerInn") ?? "").replace(/\D/g, "");
  const status = String(formData.get("status") ?? "") === "ACTIVE" ? "ACTIVE" : "TEST";
  if (!merchantLogin || !secretReference || !sellerFullName || (sellerInn.length !== 10 && sellerInn.length !== 12)) return;
  await createMerchantAccount({ merchantLogin, secretReference, sellerFullName, sellerInn, sellerTaxStatus: "SELF_EMPLOYED", status });
  revalidatePath("/admin/merchant-accounts");
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
