"use client";

import { useEffect } from "react";

/**
 * Включает циклическую микроанимацию чата только пока блок в viewport.
 * Ставит/снимает data-live="true" на секции #value.
 * При prefers-reduced-motion ничего не делает — блок статичен.
 */
export function ChatLiveliness() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const section = document.querySelector<HTMLElement>("#value");
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.setAttribute("data-live", "true");
          } else {
            section.removeAttribute("data-live");
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      section.removeAttribute("data-live");
    };
  }, []);

  return null;
}
