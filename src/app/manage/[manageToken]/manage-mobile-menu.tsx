"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./manage-page.module.css";

type Props = {
  previewHref: string;
};

const focusableSelector =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ManageMobileMenu = ({ previewHref }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

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
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileMenuTrigger}
        aria-label="Открыть меню редактора"
        aria-expanded={isOpen}
        aria-controls="manage-mobile-menu"
        onClick={() => setIsOpen(true)}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {isOpen ? (
        <div
          className={styles.mobileMenuBackdrop}
          role="presentation"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            ref={sheetRef}
            id="manage-mobile-menu"
            className={styles.mobileMenuSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-mobile-menu-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.mobileMenuHeader}>
              <div>
                <span>Редактор открытки</span>
                <h2 id="manage-mobile-menu-title">Меню</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Закрыть меню"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className={styles.mobileMenuLinks} aria-label="Общие действия">
              <Link href={previewHref} target="_blank" onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">↗</span>
                Посмотреть открытку
              </Link>
              <Link href="/account" onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">▣</span>
                Мои открытки
              </Link>
              <Link href="/support?from=manage" onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">?</span>
                Поддержка
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
};
