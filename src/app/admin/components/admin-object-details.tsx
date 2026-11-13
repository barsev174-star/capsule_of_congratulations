"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "../admin.module.css";

export function AdminObjectDetails({ title, children, initiallyOpen = false }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (initiallyOpen && !dialog.current?.open) dialog.current?.showModal(); }, [initiallyOpen]);
  return <><button type="button" className={styles.detailLink} onClick={() => dialog.current?.showModal()}>Подробнее</button><dialog ref={dialog} className={styles.objectDialog} aria-label={title} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}><div><header className={styles.objectDialogHeader}><h2 className={styles.panelTitle}>{title}</h2><button type="button" className={styles.actionButton} onClick={() => dialog.current?.close()}>Закрыть</button></header>{children}</div></dialog></>;
}
