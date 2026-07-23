"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
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
  const loopFrameRef = useRef<number | null>(null);
  const [visibleSlots, setVisibleSlots] = useState(4);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isTouching, setIsTouching] = useState(false);

  const canNavigate = items.length > visibleSlots;
  const loopItems = canNavigate ? [...items.slice(-visibleSlots), ...items, ...items.slice(0, visibleSlots)] : items;

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
    if (loopFrameRef.current !== null) window.cancelAnimationFrame(loopFrameRef.current);
  }, []);

  const getLoopPositions = useCallback(() => {
    const step = getCardStep(listRef.current, viewportRef.current, visibleSlots);
    const firstOriginal = visibleSlots * step;
    return {
      step,
      firstOriginal,
      lastOriginal: firstOriginal + Math.max(0, items.length - 1) * step
    };
  }, [items.length, visibleSlots]);

  const resetLoopPosition = useCallback((left: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ left, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!canNavigate) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const frame = window.requestAnimationFrame(() => {
      const { firstOriginal } = getLoopPositions();
      viewport.scrollTo({ left: firstOriginal, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canNavigate, getLoopPositions]);

  useEffect(() => {
    if (!canNavigate) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const finishLoop = () => {
      const { step, firstOriginal, lastOriginal } = getLoopPositions();
      if (!step) return;
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

      if (viewport.scrollLeft <= 1) {
        resetLoopPosition(lastOriginal);
      } else if (viewport.scrollLeft >= maxScrollLeft - 1) {
        resetLoopPosition(firstOriginal);
      }
    };

    const scheduleLoopFinish = () => {
      if (loopFrameRef.current !== null) window.cancelAnimationFrame(loopFrameRef.current);
      loopFrameRef.current = window.requestAnimationFrame(() => {
        finishLoop();
        loopFrameRef.current = null;
      });
    };

    viewport.addEventListener("scroll", scheduleLoopFinish, { passive: true });
    viewport.addEventListener("scrollend", finishLoop);
    return () => {
      viewport.removeEventListener("scroll", scheduleLoopFinish);
      viewport.removeEventListener("scrollend", finishLoop);
    };
  }, [canNavigate, getLoopPositions, resetLoopPosition]);

  const move = useCallback((direction: "next" | "previous") => {
    const viewport = viewportRef.current;
    if (!viewport || !canNavigate) return;

    const { step } = getLoopPositions();
    if (!step) return;
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

    viewport.scrollBy({ left: direction === "next" ? step : -step, behavior });
  }, [canNavigate, getLoopPositions, reducedMotion]);

  const autoplayEnabled = canNavigate && !isHovered && !hasFocus && !isTouching && isDocumentVisible;

  useEffect(() => {
    if (!autoplayEnabled) return;
    const timer = window.setInterval(() => move("next"), AUTOPLAY_DELAY);
    return () => window.clearInterval(timer);
  }, [autoplayEnabled, move]);

  const trackTouchStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") setIsTouching(true);
  };

  const resumeAfterTouch = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") setIsTouching(false);
  };

  return (
    <div
      className={`${styles.contribCarousel} ${!canNavigate ? styles.contribCarouselStatic : ""}`}
      aria-roledescription="carousel"
      aria-label="Поздравления участников"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
      onPointerDown={trackTouchStart}
      onPointerUp={resumeAfterTouch}
      onPointerCancel={() => setIsTouching(false)}
    >
      {canNavigate ? (
        <button type="button" className={`${styles.contribArrow} ${styles.contribArrowPrevious}`} aria-label="Показать предыдущее поздравление" onClick={() => move("previous")}>
          <span aria-hidden="true">‹</span>
        </button>
      ) : null}

      <div ref={viewportRef} className={styles.contribStripViewport}>
        <ul ref={listRef} className={styles.contribStripList}>
          {loopItems.map((item, index) => {
            const duplicated = canNavigate && (index < visibleSlots || index >= visibleSlots + items.length);
            return (
              <li key={`${duplicated ? "dup-" : ""}${index}-${item.id}`} className={styles.contribCard} aria-hidden={duplicated || undefined}>
                <span className={styles.avatar} aria-hidden="true">{getInitial(item.authorName)}</span>
                <span className={styles.contribCardBody}>
                  <span className={styles.contribAuthorName} title={item.authorName}>{item.authorName}</span>
                  <span className={styles.contribCardRole} title={item.authorRole ?? undefined}>{item.authorRole ?? ""}</span>
                  <span className={styles.contribCardText}>{item.message}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {canNavigate ? (
        <button type="button" className={`${styles.contribArrow} ${styles.contribArrowNext}`} aria-label="Показать следующее поздравление" onClick={() => move("next")}>
          <span aria-hidden="true">›</span>
        </button>
      ) : null}
    </div>
  );
};
