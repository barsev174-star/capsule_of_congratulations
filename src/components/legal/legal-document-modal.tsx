"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./legal-document-modal.module.css";

type LegalDocument = "offer" | "privacy" | "refunds";

const labels: Record<LegalDocument, string> = {
  offer: "Публичная оферта",
  privacy: "Политика обработки персональных данных",
  refunds: "Правила возврата"
};

export function LegalDocumentModal({ document, children }: { document: LegalDocument; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const url = `/${document}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <>
    <a href={url} onClick={(event) => { event.preventDefault(); setOpen(true); }}>{children}</a>
    <dialog ref={dialogRef} className={styles.dialog} aria-label={labels[document]} onClose={() => setOpen(false)}>
      <header className={styles.header}>
        <strong>{labels[document]}</strong>
        <div className={styles.actions}>
          <a href={url} target="_blank" rel="noreferrer">Открыть отдельно</a>
          <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
        </div>
      </header>
      <iframe src={url} title={labels[document]} className={styles.frame} />
    </dialog>
  </>;
}

