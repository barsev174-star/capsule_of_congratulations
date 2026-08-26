import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TeacherLandingMotion } from "./teacher-landing-motion";

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  readonly disconnect = vi.fn();
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly takeRecords = vi.fn(() => []);
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];

  constructor(readonly callback: IntersectionObserverCallback) {
    IntersectionObserverMock.instances.push(this);
  }
}

describe("TeacherLandingMotion", () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("reveals only intersecting blocks and then stops observing them", () => {
    const { container } = render(<main data-teacher-landing><section data-teacher-reveal>Первый</section><section data-teacher-reveal>Второй</section><TeacherLandingMotion /></main>);
    const targets = container.querySelectorAll("[data-teacher-reveal]");
    const observer = IntersectionObserverMock.instances[0];
    observer.callback([
      { target: targets[0], isIntersecting: true } as IntersectionObserverEntry,
      { target: targets[1], isIntersecting: false } as IntersectionObserverEntry
    ], observer as unknown as IntersectionObserver);
    expect(targets[0]).toHaveAttribute("data-teacher-revealed", "true");
    expect(targets[1]).not.toHaveAttribute("data-teacher-revealed");
    expect(observer.unobserve).toHaveBeenCalledExactlyOnceWith(targets[0]);
  });

  it("reveals birthday FAQ questions individually instead of hiding entire columns", () => {
    const { container } = render(<main data-teacher-landing><section id="faq"><div className="heading">FAQ</div><div className="column"><article>Первый</article><article>Второй</article></div></section><TeacherLandingMotion faqReveal="items" /></main>);
    const questions = container.querySelectorAll("article");
    expect(container.querySelector(".column")).not.toHaveAttribute("data-teacher-reveal");
    expect(questions[0]).toHaveAttribute("data-teacher-reveal");
    expect(questions[1]).toHaveStyle("--reveal-delay: 80ms");
    expect(IntersectionObserverMock.instances[0].observe).toHaveBeenCalledWith(questions[1]);
  });

  it("keeps content visible when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<main data-teacher-landing><section data-teacher-reveal>Контент</section><TeacherLandingMotion /></main>);
    expect(container.querySelector("main")).not.toHaveAttribute("data-motion-ready");
  });

  it("skips motion when reduced motion is already enabled", () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<main data-teacher-landing><section data-teacher-reveal>Контент</section><TeacherLandingMotion /></main>);
    expect(container.querySelector("main")).not.toHaveAttribute("data-motion-ready");
    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });

  it("immediately shows all content if reduced motion is enabled after loading", () => {
    const { container, unmount } = render(<main data-teacher-landing><section data-teacher-reveal>Контент</section><TeacherLandingMotion /></main>);
    const preference = vi.mocked(window.matchMedia).mock.results[0].value;
    const changeHandler = preference.addEventListener.mock.calls[0][1];
    changeHandler({ matches: true });
    expect(container.querySelector("main")).not.toHaveAttribute("data-motion-ready");
    expect(container.querySelector("section")).toHaveAttribute("data-teacher-revealed", "true");
    unmount();
    expect(preference.removeEventListener).toHaveBeenCalledWith("change", changeHandler);
  });

  it("reveals a keyboard-focused link and its containing block", () => {
    const { container } = render(<main data-teacher-landing><section data-teacher-reveal><a href="#example">Пример</a></section><TeacherLandingMotion /></main>);
    fireEvent.focusIn(container.querySelector("a")!);
    expect(container.querySelector("section")).toHaveAttribute("data-teacher-revealed", "true");
  });

  it("reveals all content when the page is restored from browser history", () => {
    const { container } = render(
      <>
        <main data-teacher-landing>
          <section data-teacher-reveal>Первый блок</section>
          <div data-teacher-reveal-line>Линия</div>
        </main>
        <TeacherLandingMotion />
      </>
    );

    const root = container.querySelector("[data-teacher-landing]");
    const targets = Array.from(container.querySelectorAll("[data-teacher-reveal], [data-teacher-reveal-line]"));
    expect(root).toHaveAttribute("data-motion-ready", "true");
    expect(targets.every((target) => target.hasAttribute("data-teacher-revealed"))).toBe(false);

    const pageShow = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(pageShow, "persisted", { value: true });
    fireEvent(window, pageShow);

    expect(root).not.toHaveAttribute("data-motion-ready");
    expect(targets.every((target) => target.getAttribute("data-teacher-revealed") === "true")).toBe(true);
    expect(IntersectionObserverMock.instances[0]?.disconnect).toHaveBeenCalled();
  });

  it("reveals all content when Next.js restores the route through popstate", () => {
    const { container } = render(
      <>
        <main data-teacher-landing>
          <section data-teacher-reveal>Интерактивный пример</section>
        </main>
        <TeacherLandingMotion />
      </>
    );

    const root = container.querySelector("[data-teacher-landing]");
    const target = container.querySelector("[data-teacher-reveal]");
    fireEvent.popState(window);

    expect(root).not.toHaveAttribute("data-motion-ready");
    expect(target).toHaveAttribute("data-teacher-revealed", "true");
  });

  it("reveals all content after Next.js restores a saved scroll position", () => {
    vi.useFakeTimers();
    const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(900);

    const { container } = render(
      <>
        <main data-teacher-landing>
          <section data-teacher-reveal>Возвращённый блок</section>
        </main>
        <TeacherLandingMotion />
      </>
    );

    vi.advanceTimersByTime(150);

    expect(container.querySelector("[data-teacher-landing]")).not.toHaveAttribute("data-motion-ready");
    expect(container.querySelector("[data-teacher-reveal]")).toHaveAttribute("data-teacher-revealed", "true");

    scrollY.mockRestore();
    vi.useRealTimers();
  });
});
