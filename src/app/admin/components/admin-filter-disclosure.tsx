"use client";
import { useId, useState, type ReactNode } from "react";
import styles from "../admin.module.css";
export function AdminFilterDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={styles.filterDisclosure}><button type="button" className={styles.filterToggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Фильтры <span aria-hidden="true">{open ? "−" : "+"}</span></button><div id={id} className={`${styles.filterContent} ${open ? styles.filterContentOpen : ""}`}>{children}</div></div>;
}
