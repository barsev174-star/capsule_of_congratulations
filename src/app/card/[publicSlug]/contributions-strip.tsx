"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./participant-page.module.css";

export type ContributionStripItem = {
  id: string;
  authorName: string;
  authorRole: string | null;
  message: string;
};

const AUTOPLAY_DELAY = 5000;

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "Д";

const getVisibleSlots = () => {
  if (window.innerWidth >= 1180) return 4;
  if (window.innerWidth >= 720) return 3;
  return 1;
};

const getCardStep = (list: HTMLUListElement | null, viewport: HTMLDivElement | null, visibleSlots: number) => {
  const card = list?.querySelector("li");
  if (!list || !card) return viewport ? viewport.clientWidth / visibleSlots : 0;

  const gap = Number.parseFloat(window.getComputedStyle(list).gap) || 0;
  return card.getBoundingClientRect().width + gap;
};

export const ContributionsStrip = ({ items }: { items: ContributionStripItem[] }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const loopResetRef = useRef<number | null>(null);
  const [visibleSlots, setVisibleSlots] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [manualStop, setManualStop] = useState(false);

  const canNavigate = items.length > visibleSlots;
  const loopItems = canNavigate ? [...items, ...items.slice(0, visibleSlots)] : items;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateViewport = () => setVisibleSlots(getVisibleSlots());
    const updateMotion = () => setReducedMotion(media.matches);
    const updateDocumentVisibility = () => setIsDocumentVisible(!document.hidden);

    updateViewport();
    updateMotion();
    updateDocumentVisibility();
    window.addEventListener("resize", updateViewport);
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateDocumentVisibility);

    return () => {
      window.removeEventListener("resize", updateViewport);
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateDocumentVisibility);
    };
  }, []);

  useEffect(() => () => {
    if (loopResetRef.current !== null) window.clearTimeout(loopResetRef.current);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setIsInViewport(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const move = useCallback((direction: "next" | "previous", manual = false) => {
    const viewport = viewportRef.current;
    if (!viewport || !canNavigate) return;
    if (manual) setManualStop(true);

    const step = getCardStep(listRef.current, viewport, visibleSlots);
    if (!step) return;
    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

    if (direction === "previous") {
      if (viewport.scrollLeft <= 1) {
        const lastOriginalPosition = Math.max(0, maxScrollLeft - visibleSlots * step);
        viewport.scrollTo({ left: lastOriginalPosition, behavior: "auto" });
        return;
      }
      viewport.scrollBy({ left: -step, behavior });
      return;
    }

    if (viewport.scrollLeft + step >= maxScrollLeft - 1) {
      viewport.scrollTo({ left: maxScrollLeft, behavior });
      if (loopResetRef.current !== null) window.clearTimeout(loopResetRef.current);
      loopResetRef.current = window.setTimeout(() => {
        viewport.scrollTo({ left: 0, behavior: "auto" });
        loopResetRef.current = null;
      }, reducedMotion ? 0 : 340);
      return;
    }
    viewport.scrollBy({ left: step, behavior });
  }, [canNavigate, reducedMotion, visibleSlots]);

  const autoplayEnabled = canNavigate && !manualStop && !reducedMotion && !isHovered && !hasFocus && isInViewport && isDocumentVisible;

  useEffect(() => {
    if (!autoplayEnabled) return;
    const timer = window.setInterval(() => move("next"), AUTOPLAY_DELAY);
    return () => window.clearInterval(timer);
  }, [autoplayEnabled, move]);

  const pauseForManualInteraction = () => setManualStop(true);

  return (
    <div
      className={styles.contribCarousel}
      aria-roledescription="carousel"
      aria-label="Поздравления участников"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "touch" || event.pointerType === "pen") pauseForManualInteraction();
      }}
    >
      {canNavigate ? (
        <button type="button" className={`${styles.contribArrow} ${styles.contribArrowPrevious}`} aria-label="Показать предыдущее поздравление" onClick={() => move("previous", true)}>
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}

      <div ref={viewportRef} className={styles.contribStripViewport}>
        <ul ref={listRef} className={styles.contribStripList}>
          {loopItems.map((item, index) => {
            const duplicated = index >= items.length;
            return (
              <li key={`${duplicated ? "dup-" : ""}${item.id}`} className={styles.contribCard} aria-hidden={duplicated || undefined}>
                <span className={styles.avatar} aria-hidden="true">{getInitial(item.authorName)}</span>
                <span className={styles.contribCardBody}>
                  <span className={styles.contribCardName}>
                    <span className={styles.contribAuthorName}>{item.authorName}</span>
                    {item.authorRole ? <span className={styles.contribCardRole}> · {item.authorRole}</span> : null}
                  </span>
                  <span className={styles.contribCardText}>{item.message}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {canNavigate ? (
        <button type="button" className={`${styles.contribArrow} ${styles.contribArrowNext}`} aria-label="Показать следующее поздравление" onClick={() => move("next", true)}>
          <span aria-hidden="true">›</span>
        </button>
      ) : null}
    </div>
  );
};
