import type { OccasionId } from "@/lib/cards/templates";

export type PaymentOrderStatus = "CREATED" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "CANCELED" | "REVOKED";

export type PaymentOrder = {
  id: string;
  cardId: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string | null;
  providerOrderId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateOverride = {
  id: string;
  name: string | null;
  description: string | null;
  accent: string | null;
  recommendedFor: OccasionId[] | null;
  isActive: boolean;
  updatedAt: string;
};

export type AdminUserRole = "admin" | "moderator" | "support";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminUserRole;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserWithCredentials = AdminUser & {
  passwordHash: string;
  passwordSalt: string;
};
