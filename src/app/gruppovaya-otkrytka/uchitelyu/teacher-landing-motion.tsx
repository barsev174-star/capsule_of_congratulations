"use client";

import { useEffect } from "react";

/**
 * Локальный scroll-reveal для teacher landing.
 * Progressive enhancement: без JS и при prefers-reduced-motion контент
 * остаётся полностью видимым — начальные скрытые состояния включаются
 * только после того, как компонент пометил корень data-motion-ready.
 *
 * FAQ — отдельный shared-компонент, его разметка не меняется: группы
 * (заголовок и две колонки) помечаются data-teacher-reveal здесь, до включения
 * motion-ready, и получают те же reveal-стили, что и остальная страница.
 */
export function TeacherLandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.querySelector("[data-teacher-landing]");
    if (!root) return;

    const faq = root.querySelector("#faq");
    if (faq) {
      const heading = faq.querySelector('[class*="heading"]');
      if (heading instanceof HTMLElement) heading.setAttribute("data-teacher-reveal", "");
      faq.querySelectorAll('[class*="column"]').forEach((column, index) => {
        if (!(column instanceof HTMLElement)) return;
        column.setAttribute("data-teacher-reveal", "");
        column.style.setProperty("--reveal-delay", `${90 + index * 90}ms`);
      });
    }

    root.setAttribute("data-motion-ready", "true");

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

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", revealAfterHistoryRestore);

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
      observer.disconnect();
      root.removeAttribute("data-motion-ready");
    };
  }, []);

  return null;
}
