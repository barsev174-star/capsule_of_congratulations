"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminUserRole } from "@/lib/admin/types";
import styles from "../admin.module.css";

const navItems: { href: string; label: string; minRole: AdminUserRole }[] = [
  { href: "/admin", label: "Dashboard", minRole: "support" },
  { href: "/admin/cards", label: "Открытки", minRole: "moderator" },
  { href: "/admin/contributions", label: "Поздравления", minRole: "support" },
  { href: "/admin/support", label: "Обращения", minRole: "support" },
  { href: "/admin/orders", label: "Заказы", minRole: "admin" },
  { href: "/admin/templates", label: "Шаблоны", minRole: "admin" },
  { href: "/admin/users", label: "Администраторы", minRole: "admin" }
];

type AdminNavProps = {
  role: AdminUserRole;
};

const roleHierarchy: Record<AdminUserRole, number> = {
  admin: 3,
  moderator: 2,
  support: 1
};

export function AdminNav({ role }: AdminNavProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => roleHierarchy[role] >= roleHierarchy[item.minRole]);

  return (
    <nav className={styles.nav} aria-label="Админ-меню">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
