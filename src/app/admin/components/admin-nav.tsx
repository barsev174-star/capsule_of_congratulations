"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminRoleSatisfies } from "@/lib/admin/permissions";
import type { AdminUserRole } from "@/lib/admin/types";
import styles from "../admin.module.css";

const navItems: { href: string; label: string; minRole: AdminUserRole }[] = [
  { href: "/admin", label: "Обзор", minRole: "support" },
  { href: "/admin/analytics", label: "Аналитика", minRole: "admin" },
  { href: "/admin/cards", label: "Открытки", minRole: "moderator" },
  { href: "/admin/contributions", label: "Поздравления", minRole: "support" },
  { href: "/admin/reminders", label: "Напоминания", minRole: "admin" },
  { href: "/admin/support", label: "Обращения", minRole: "support" },
  { href: "/admin/orders", label: "Заказы", minRole: "admin" },
  { href: "/admin/payments", label: "Платежи", minRole: "admin" },
  { href: "/admin/templates", label: "Шаблоны", minRole: "admin" },
  { href: "/admin/users", label: "Администраторы", minRole: "admin" }
];

type AdminNavProps = {
  role: AdminUserRole;
  onNavigate?: () => void;
};

export function AdminNav({ role, onNavigate }: AdminNavProps) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => adminRoleSatisfies(role, item.minRole));

  return (
    <nav className={styles.nav} aria-label="Админ-меню">
      {visibleItems.map((item, index) => {
        const isActive = item.href === "/admin"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/admin/payments" && pathname === "/admin/merchant-accounts");

        return (
          <div key={item.href}>{(index === 0 || item.href === "/admin/orders" || item.href === "/admin/templates") && <span className={styles.navGroup}>{index === 0 ? "Основное" : item.href === "/admin/orders" ? "Финансы" : "Настройки"}</span>}<Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link></div>
        );
      })}
    </nav>
  );
}
