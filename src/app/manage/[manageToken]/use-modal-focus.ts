"use client";

import { useEffect, useRef, type RefObject } from "react";

let modalDepth = 0;
let rootOverflow = "";
let rootAriaHidden: string | null = null;
let rootHadInert = false;

export const useModalFocus = (dialogRef: RefObject<HTMLElement | null>, onEscape: () => void) => {
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const main = document.querySelector("main");
    if (modalDepth === 0) {
      rootOverflow = document.body.style.overflow;
      rootAriaHidden = main?.getAttribute("aria-hidden") ?? null;
      rootHadInert = main?.hasAttribute("inert") ?? false;
    }
    modalDepth += 1;
    document.body.style.overflow = "hidden";
    document.body.classList.add("manage-modal-open");
    main?.setAttribute("aria-hidden", "true");
    main?.setAttribute("inert", "");
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
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

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      modalDepth = Math.max(0, modalDepth - 1);
      if (modalDepth === 0) {
        document.body.style.overflow = rootOverflow;
        document.body.classList.remove("manage-modal-open");
        if (main) {
          if (rootAriaHidden == null) main.removeAttribute("aria-hidden");
          else main.setAttribute("aria-hidden", rootAriaHidden);
          if (!rootHadInert) main.removeAttribute("inert");
        }
      }
      if (opener?.isConnected) opener.focus();
    };
  }, [dialogRef]);
};
