"use client";

import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import "./scroll-reveal.module.css";

export type RevealVariant =
  | "fade-up"
  | "fade-down"
  | "slide-left"
  | "slide-right"
  | "scale-in"
  | "stagger";

type RevealOptions = {
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  step?: number;
  onReveal?: () => void;
};

const revealCallbacks = new Map<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

const getSharedObserver = () => {
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-reveal-visible", "true");
          const callback = revealCallbacks.get(entry.target);
          revealCallbacks.delete(entry.target);
          sharedObserver?.unobserve(entry.target);
          callback?.();
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
  }
  return sharedObserver;
};

const isReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Hook: returns props to spread onto an element (`{...reveal}`) and reveals it
 * once it enters the viewport. Reveal runs only once per mount; a single
 * IntersectionObserver is shared by all reveal elements on the page.
 */
export function useScrollReveal<T extends HTMLElement>(options?: RevealOptions) {
  const { variant = "fade-up", delay = 0, duration, step, onReveal } = options ?? {};
  const onRevealRef = useRef(onReveal);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  const ref = useCallback(
    (element: T | null) => {
      if (!element) return undefined;
      if (isReducedMotion()) {
        onRevealRef.current?.();
        return undefined;
      }
      element.setAttribute("data-reveal", variant);
      const callback = () => onRevealRef.current?.();
      revealCallbacks.set(element, callback);
      getSharedObserver().observe(element);
      return () => {
        revealCallbacks.delete(element);
        sharedObserver?.unobserve(element);
      };
    },
    [variant]
  );

  const style = useMemo(() => {
    const value: Record<string, string> = {};
    if (delay) value["--reveal-delay"] = `${delay}ms`;
    if (duration) value["--reveal-duration"] = `${duration}ms`;
    if (step) value["--reveal-step"] = `${step}ms`;
    return value as CSSProperties;
  }, [delay, duration, step]);

  return useMemo(() => ({ ref, style }), [ref, style]);
}

type ScrollRevealProps = RevealOptions & {
  children: ReactNode;
  className?: string;
};

/**
 * Wrapper component for cases where an extra <div> does not affect layout.
 * For grid/flex children spread useScrollReveal directly onto the element.
 */
export const ScrollReveal = ({ children, className, ...options }: ScrollRevealProps) => {
  const reveal = useScrollReveal<HTMLDivElement>(options);
  return (
    <div {...reveal} className={className}>
      {children}
    </div>
  );
};
