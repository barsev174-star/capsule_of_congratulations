"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal для сценарных SEO-страниц.
 * Progressive enhancement: без JS и при prefers-reduced-motion контент
 * остаётся полностью видимым — начальные скрытые состояния включаются
 * только после того, как компонент пометил корень data-motion-ready.
 *
 * FAQ — отдельный shared-компонент, его разметка не меняется: заголовок
 * и колонки либо отдельные вопросы помечаются здесь до motion-ready.
 */
export function TeacherLandingMotion({ faqReveal = "columns" }: { faqReveal?: "columns" | "items" } = {}) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || typeof IntersectionObserver === "undefined") return;

    const root = document.querySelector("[data-teacher-landing]");
    if (!root) return;

    const faq = root.querySelector("#faq");
    if (faq) {
      const heading = faq.querySelector('[class*="heading"]');
      if (heading instanceof HTMLElement) heading.setAttribute("data-teacher-reveal", "");
      const selector = faqReveal === "items" ? "article" : '[class*="column"]';
      faq.querySelectorAll(selector).forEach((item, index) => {
        if (!(item instanceof HTMLElement)) return;
        item.setAttribute("data-teacher-reveal", "");
        item.style.setProperty("--reveal-delay", `${faqReveal === "items" ? (index % 2) * 80 : 90 + index * 90}ms`);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-teacher-revealed", "true");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    const revealTargets = Array.from(root.querySelectorAll("[data-teacher-reveal], [data-teacher-reveal-line]"));
    revealTargets.forEach((target) => observer.observe(target));
    root.setAttribute("data-motion-ready", "true");

    /*
     * Chromium может вернуть документ из back/forward cache вместе с уже
     * выставленным data-motion-ready, но без надёжно возобновившегося
     * IntersectionObserver. В таком состоянии CSS продолжает скрывать
     * элементы. После возврата из истории анимация уже не важна — контент
     * должен быть доступен сразу, поэтому используем fail-open поведение.
     */
    const revealAfterHistoryRestore = () => {
      observer.disconnect();
      revealTargets.forEach((target) => target.setAttribute("data-teacher-revealed", "true"));
      root.removeAttribute("data-motion-ready");
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) revealAfterHistoryRestore();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) revealAfterHistoryRestore();
    };
    const revealFocusedContent = (event: Event) => {
      const focused = event.target;
      if (!(focused instanceof HTMLElement)) return;
      // A keyboard user can reach a link before its scroll reveal finishes.
      revealTargets.forEach((target) => {
        if (target.contains(focused)) {
          target.setAttribute("data-teacher-revealed", "true");
          observer.unobserve(target);
        }
      });
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", revealAfterHistoryRestore);
    reducedMotion.addEventListener("change", handleMotionPreference);
    root.addEventListener("focusin", revealFocusedContent);

    // Next Router восстанавливает scroll после popstate и затем монтирует
    // сегмент заново. Небольшая отложенная проверка ловит этот вариант,
    // когда обработчик предыдущего сегмента уже был снят.
    const restorePositionTimer = window.setTimeout(() => {
      if (window.scrollY > 0) revealAfterHistoryRestore();
    }, 150);

    return () => {
      window.clearTimeout(restorePositionTimer);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", revealAfterHistoryRestore);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      root.removeEventListener("focusin", revealFocusedContent);
      observer.disconnect();
      root.removeAttribute("data-motion-ready");
    };
  }, [faqReveal]);

  return null;
}
