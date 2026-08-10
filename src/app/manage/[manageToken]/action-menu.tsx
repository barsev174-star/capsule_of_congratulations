"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type ReactNode
} from "react";
import styles from "./manage-page.module.css";

type Props = {
  label: string;
  children: ReactNode;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

const getEnabledItems = (root: HTMLDivElement | null) => (
  root ? Array.from(root.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')) : []
);

export const MenuDotsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.actionMenuDotsIcon}>
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);

export const MenuEditIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></svg>;
export const MenuReplaceIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="13" rx="2.2" /><circle cx="8" cy="9" r="1.35" /><path d="m4.5 15 3.7-3.5 2.5 2.2 2.2-2.3 2.6 2.8" /><path d="M16.5 8H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V17" /></svg>;
export const MenuMoveIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="6" height="14" rx="1.5" /><rect x="15" y="5" width="6" height="14" rx="1.5" /><path d="M10.5 9.5h3m0 0L12 8m1.5 1.5L12 11M13.5 14.5h-3m0 0L12 13m-1.5 1.5L12 16" /></svg>;
export const MenuDeleteIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;

export const ActionMenu = ({
  label,
  children,
  className,
  triggerClassName,
  menuClassName,
  onOpenChange
}: Props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const changeOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [onOpenChange]);

  const focusItem = (position: "first" | "last") => {
    window.requestAnimationFrame(() => {
      const items = getEnabledItems(rootRef.current);
      items[position === "first" ? 0 : items.length - 1]?.focus();
    });
  };

  useEffect(() => {
    if (!open) return;
    getEnabledItems(rootRef.current)[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) changeOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      changeOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [changeOpen, open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = getEnabledItems(rootRef.current);
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    if (event.key === "ArrowUp") nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className={`${styles.actionMenu} ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.actionMenuTrigger} ${triggerClassName ?? ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          const nextOpen = !open;
          changeOpen(nextOpen);
          if (nextOpen) focusItem("first");
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          if (!open) changeOpen(true);
          focusItem(event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        <MenuDotsIcon />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`${styles.actionMenuList} ${menuClassName ?? ""}`}
          onKeyDown={handleMenuKeyDown}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest('[role="menuitem"]:not([disabled])')) return;
            changeOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};
