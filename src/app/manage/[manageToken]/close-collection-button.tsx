"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { closeCollectionAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
};

export const CloseCollectionButton = ({ manageToken }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setIsAcknowledged(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "input:not([disabled]), button:not([disabled])"
        )
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [closeDialog, isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.closeCollectionTrigger}
        onClick={() => setIsOpen(true)}
      >
        Закрыть сбор
      </button>
      {isOpen ? (
        <div
          className={styles.collectionDialogBackdrop}
          role="presentation"
          onMouseDown={closeDialog}
        >
          <section
            ref={dialogRef}
            className={styles.collectionDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-collection-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="close-collection-title">Закрыть сбор поздравлений?</h2>
            <p>После закрытия начнётся финальная подготовка открытки:</p>
            <ul className={styles.collectionDialogConsequences}>
              <li>участники не смогут добавлять поздравления, фотографии и голоса;</li>
              <li>вы перейдёте к финальной проверке содержания и оформления;</li>
              <li>после подготовки и оплаты станет доступна приватная ссылка получателя.</li>
            </ul>
            <p className={styles.collectionDialogHint}>
              До передачи открытки сбор можно будет открыть снова.
            </p>
            <label className={styles.collectionDialogAcknowledgement}>
              <input
                type="checkbox"
                checked={isAcknowledged}
                onChange={(event) => setIsAcknowledged(event.target.checked)}
              />
              <span>Я понимаю последствия и хочу перейти к финальной проверке.</span>
            </label>
            <div className={styles.collectionDialogActions}>
              <button ref={cancelRef} type="button" onClick={closeDialog}>
                Оставить сбор открытым
              </button>
              <form action={closeCollectionAction}>
                <input type="hidden" name="manageToken" value={manageToken} />
                <button type="submit" disabled={!isAcknowledged}>Закрыть сбор</button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};
