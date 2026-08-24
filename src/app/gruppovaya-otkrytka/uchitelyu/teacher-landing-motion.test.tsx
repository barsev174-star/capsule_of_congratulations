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

  constructor() {
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
    vi.unstubAllGlobals();
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
