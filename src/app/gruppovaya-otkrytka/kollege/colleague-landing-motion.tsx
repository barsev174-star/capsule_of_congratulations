"use client";

import { useEffect } from "react";

/** Shared SEO reveal styles, with lifecycle scoped to the colleague page. */
export function ColleagueLandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-colleague-landing]");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.querySelector("#faq h2")?.setAttribute("data-teacher-reveal", "");
    root.querySelectorAll<HTMLElement>("#faq article").forEach((card, index) => {
      card.setAttribute("data-teacher-reveal", "");
      card.setAttribute("data-colleague-lift", "");
      card.style.setProperty("--reveal-delay", `${(index % 5) * 70}ms`);
    });

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-teacher-reveal], [data-teacher-reveal-line]"));
    let observer: IntersectionObserver | undefined;
    let restoreFrame = 0;

    const reveal = (target: Element) => {
      target.setAttribute("data-teacher-revealed", "true");
      observer?.unobserve(target);
    };

    const start = () => {
      observer?.disconnect();
      if (reducedMotion.matches || typeof IntersectionObserver === "undefined") {
        root.removeAttribute("data-motion-ready");
        targets.forEach(reveal);
        return;
      }

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

      root.setAttribute("data-motion-ready", "true");
      targets.forEach((target) => {
        if (!target.hasAttribute("data-teacher-revealed")) observer?.observe(target);
      });
    };

    // Reconnect after history restoration, but keep later blocks animated.
    // Ordinary scrolling must never disable all reveals on the page.
    const restore = () => {
      start();
      window.cancelAnimationFrame(restoreFrame);
      restoreFrame = window.requestAnimationFrame(() => {
        targets.forEach((target) => {
          if (target.getBoundingClientRect().top < window.innerHeight * 0.94) reveal(target);
        });
      });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) restore();
    };
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      targets.forEach((target) => {
        if (target.contains(event.target as Element)) reveal(target);
      });
    };

    start();
    reducedMotion.addEventListener("change", start);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", restore);
    root.addEventListener("focusin", onFocus);

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(restoreFrame);
      reducedMotion.removeEventListener("change", start);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", restore);
      root.removeEventListener("focusin", onFocus);
      root.removeAttribute("data-motion-ready");
    };
  }, []);

  return null;
}
