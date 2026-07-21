"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    sections.forEach((section, index) => {
      section.dataset.motionReady = "true";
      section.dataset.motionIndex = String(index);
      const sectionId = section.id || section.dataset.section || "";
      if (sectionId) section.dataset.section = sectionId;
    });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.setAttribute("data-motion-visible", "true");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.16, rootMargin: "0px 0px -40px 0px" });
    sections.forEach((section) => observer.observe(section));
    const header = document.querySelector<HTMLElement>("header");
    const hero = document.querySelector<HTMLElement>("#hero");
    const mobileMq = window.matchMedia("(max-width: 1099px)");
    let frame = 0;
    let lastY = window.scrollY;
    let accDown = 0;
    let accUp = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      header?.toggleAttribute("data-scrolled", y > 90);
      if (hero) hero.style.setProperty("--hero-parallax", `${Math.min(y * .05, 22)}px`);
      if (!header) return;
      // На широком desktop шапка не скрывается
      if (!mobileMq.matches) {
        header.removeAttribute("data-hidden");
        return;
      }
      // При открытом меню шапка всегда видна, счётчики сброшены — без скачка после закрытия
      if (header.hasAttribute("data-menu-open")) {
        header.removeAttribute("data-hidden");
        accDown = 0;
        accUp = 0;
        return;
      }
      // В верхней части страницы шапка всегда видна
      if (y <= 80) {
        header.removeAttribute("data-hidden");
        accDown = 0;
        accUp = 0;
        return;
      }
      if (delta > 0) {
        accDown += delta;
        accUp = 0;
      } else if (delta < 0) {
        accUp += -delta;
        accDown = 0;
      }
      if (accDown >= 14) {
        header.setAttribute("data-hidden", "true");
      } else if (accUp >= 10) {
        header.removeAttribute("data-hidden");
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return null;
}
