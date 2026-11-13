"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AdminUserRole } from "@/lib/admin/types";
import { BrandLogo } from "@/components/brand/brand-logo";
import { logoutAdminAction } from "../login/actions";
import { AdminNav } from "./admin-nav";
import styles from "../admin.module.css";

export function AdminShellFrame({ email, role, children }: { email: string; role: AdminUserRole; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const main = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [pathname, query]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  const close = () => dialog.current?.close();
  const account = <div className={styles.drawerAccount}><span className={styles.headerEmail}>{email}</span><form action={logoutAdminAction}><button type="submit" className={styles.headerLogout}>Выйти</button></form></div>;
  return <div className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.headerBrand}>
        <button type="button" className={styles.menuButton} aria-label="Открыть меню" aria-expanded={open} aria-controls="admin-drawer" onClick={() => { dialog.current?.showModal(); setOpen(true); }}><span aria-hidden="true">☰</span></button>
        <BrandLogo /><span className={styles.headerTag}>Админка</span>
      </div>
      <div className={styles.desktopAccount}>{account}</div>
    </header>
    <div className={styles.body}>
      <aside className={styles.sidebar}><AdminNav role={role} /></aside>
      <main ref={main} id="admin-content" className={styles.main} data-menu-open={open || undefined}>{children}</main>
    </div>
    <dialog ref={dialog} id="admin-drawer" className={styles.drawer} aria-label="Разделы админки" onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.drawerContent}>
        <header className={styles.drawerHeader}><strong>Разделы админки</strong><button type="button" className={styles.actionButton} onClick={close} aria-label="Закрыть меню">Закрыть</button></header>
        <div className={styles.drawerNav}><AdminNav role={role} onNavigate={close} /></div>
        {account}
      </div>
    </dialog>
  </div>;
}
