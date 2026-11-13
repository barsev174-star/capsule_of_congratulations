"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "../admin.module.css";

const tabs = [["funnel", "Воронка"], ["sources", "Источники"], ["reminders", "Напоминания"], ["ai", "ИИ и расходы"], ["technical", "Техническое"]];
export function AdminAnalyticsTabs({ tab, days }: { tab: string; days: number | null }) {
  const container = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = container.current, active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollLeft = Math.max(0, active.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft - (nav.clientWidth - active.offsetWidth) / 2);
  }, [tab]);
  return <nav ref={container} className={`${styles.tabs} ${styles.analyticsTabs}`} aria-label="Разделы аналитики">{tabs.map(([value, label]) => <Link key={value} href={`/admin/analytics?tab=${value}&days=${days ?? "all"}`} aria-current={tab === value ? "page" : undefined}>{label}</Link>)}</nav>;
}
