"use client";

import { useEffect } from "react";

export function HomeMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    const cards = sections.flatMap((section) => Array.from(section.querySelectorAll<HTMLElement>(":scope .js-motion-card")));
    sections.forEach((section, index) => { section.dataset.motionReady = "true"; section.dataset.motionIndex = String(index); });
    cards.forEach((card) => { card.dataset.motionCard = "true"; });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.setAttribute("data-motion-visible", "true"); observer.unobserve(entry.target); } }), { threshold: 0.18 });
    sections.forEach((section) => observer.observe(section));
    const header = document.querySelector<HTMLElement>("header");
    const hero = document.querySelector<HTMLElement>("#hero");
    let frame = 0;
    const update = () => { frame = 0; const y = window.scrollY; header?.toggleAttribute("data-scrolled", y > 90); if (hero) hero.style.setProperty("--hero-parallax", `${Math.min(y * .045, 18)}px`); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return null;
}
