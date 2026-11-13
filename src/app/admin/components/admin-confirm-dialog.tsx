"use client";

import { useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import styles from "../admin.module.css";

export function AdminConfirmDialog({ children, message, danger = true }: { children: ReactNode; message: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  return <>
    <button ref={trigger} type="submit" disabled={pending} className={danger ? `${styles.actionButton} ${styles.actionButtonDanger}` : styles.filterButton} onClick={(event) => {
      if (confirmed.current) { confirmed.current = false; return; }
      event.preventDefault(); dialog.current?.showModal();
    }}>{children}</button>
    <dialog ref={dialog} className={styles.confirmDialog} aria-label="Подтверждение действия" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <h2 className={styles.panelTitle}>Подтвердите действие</h2><p>{message}</p>
      <div className={styles.dialogActions}><button type="button" autoFocus className={styles.actionButton} onClick={() => dialog.current?.close()}>Отмена</button><button type="button" className={danger ? `${styles.actionButton} ${styles.actionButtonDanger}` : styles.filterButton} onClick={() => {
        const button = trigger.current;
        dialog.current?.close();
        if (button?.form?.reportValidity()) { confirmed.current = true; button.click(); }
      }}>Подтвердить</button></div>
    </dialog>
  </>;
}
