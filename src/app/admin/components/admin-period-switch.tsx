import Link from "next/link";
import type { AdminPeriod } from "@/lib/admin/format";
import styles from "../admin.module.css";

export function AdminPeriodSwitch({ pathname, days, params = {} }: { pathname: string; days: AdminPeriod; params?: Record<string, string> }) {
  return <nav className={styles.periodSwitch} aria-label="Период отчёта">{([7, 30, 90, null] as const).map((period) => {
    const query = new URLSearchParams({ ...params, days: period === null ? "all" : String(period) });
    return <Link key={String(period)} href={`${pathname}?${query}`} aria-current={period === days ? "page" : undefined} className={period === days ? styles.periodActive : ""}>{period === null ? "Всё время" : `${period} дней`}</Link>;
  })}</nav>;
}
