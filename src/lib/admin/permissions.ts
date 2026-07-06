import type { AdminUserRole } from "./types";

const roleHierarchy: Record<AdminUserRole, number> = {
  admin: 3,
  moderator: 2,
  support: 1
};

export const adminRoleSatisfies = (actual: AdminUserRole, required: AdminUserRole) =>
  roleHierarchy[actual] >= roleHierarchy[required];
