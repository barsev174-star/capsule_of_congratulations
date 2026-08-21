"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { closeCollectionAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  label?: string;
};

export const CloseCollectionButton = ({ manageToken, label = "Закрыть сбор" }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
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
        {label}
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
              <li>участники не смогут добавлять поздравления и голосовать за подарок;</li>
              <li>вы перейдёте к спокойной финальной проверке содержания и оформления;</li>
              <li>сбор можно открыть снова до передачи открытки получателю.</li>
            </ul>
            <div className={styles.collectionDialogActions}>
              <button ref={cancelRef} type="button" onClick={closeDialog}>
                Оставить сбор открытым
              </button>
              <form action={closeCollectionAction}>
                <input type="hidden" name="manageToken" value={manageToken} />
                <button type="submit">Закрыть сбор</button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
};
