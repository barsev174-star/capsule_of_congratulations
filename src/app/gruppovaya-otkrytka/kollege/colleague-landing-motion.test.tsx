import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColleagueLandingMotion } from "./colleague-landing-motion";

class ObserverMock {
  static instances: ObserverMock[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(readonly callback: IntersectionObserverCallback) {
    ObserverMock.instances.push(this);
  }

  enter(target: Element) {
    this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const preference = {
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

function fixture() {
  return render(
    <main data-colleague-landing>
      <section data-teacher-reveal><button>Первый блок</button></section>
      <section data-teacher-reveal>Следующий блок</section>
      <section id="faq"><h2>Вопросы</h2><article>Ответ</article></section>
      <ColleagueLandingMotion />
    </main>
  );
}

describe("ColleagueLandingMotion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ObserverMock.instances = [];
    preference.matches = false;
    vi.stubGlobal("IntersectionObserver", ObserverMock);
    vi.stubGlobal("matchMedia", vi.fn(() => preference));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reveals each block only when it enters and also observes FAQ cards", () => {
    const { container } = fixture();
    const [first, second] = container.querySelectorAll("[data-teacher-reveal]");
    const observer = ObserverMock.instances[0];
    expect(observer.observe).toHaveBeenCalledTimes(4);
    observer.enter(first);
    expect(first).toHaveAttribute("data-teacher-revealed", "true");
    expect(second).not.toHaveAttribute("data-teacher-revealed");
    expect(observer.unobserve).toHaveBeenCalledWith(first);
    expect(container.querySelector("#faq article")).toHaveAttribute("data-colleague-lift");
  });

  it("keeps later blocks animated after early scrolling or mounting at a saved position", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "scrollY", "get").mockReturnValue(900);
    const { container } = fixture();
    fireEvent.scroll(window);
    vi.advanceTimersByTime(1000);
    expect(container.querySelector("main")).toHaveAttribute("data-motion-ready", "true");
    expect(container.querySelectorAll("[data-teacher-revealed]")).toHaveLength(0);
    expect(ObserverMock.instances[0].disconnect).not.toHaveBeenCalled();
  });

  it.each(["reduced motion", "missing observer"])("keeps content accessible with %s", (condition) => {
    if (condition === "reduced motion") preference.matches = true;
    else vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = fixture();
    expect(container.querySelector("main")).not.toHaveAttribute("data-motion-ready");
    expect(container.querySelectorAll("[data-teacher-revealed]")).toHaveLength(4);
  });

  it("responds to changes in the reduced-motion preference", () => {
    const { container } = fixture();
    preference.matches = true;
    const changeHandler = preference.addEventListener.mock.calls[0][1] as () => void;
    changeHandler();
    expect(container.querySelector("main")).not.toHaveAttribute("data-motion-ready");
    expect(ObserverMock.instances[0].disconnect).toHaveBeenCalled();
  });

  it("reveals a keyboard-focused control without waiting for scrolling", () => {
    const { container, getByRole } = fixture();
    fireEvent.focusIn(getByRole("button"));
    expect(container.querySelector("[data-teacher-reveal]")).toHaveAttribute("data-teacher-revealed", "true");
  });

  it.each(["popstate", "pageshow"])("reconnects on %s without revealing blocks below the viewport", (eventName) => {
    vi.useFakeTimers();
    const { container } = fixture();
    const [first, second] = container.querySelectorAll("[data-teacher-reveal]");
    vi.spyOn(first, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue({ top: 4000 } as DOMRect);
    const event = new Event(eventName);
    if (eventName === "pageshow") Object.defineProperty(event, "persisted", { value: true });
    fireEvent(window, event);
    vi.advanceTimersByTime(20);
    expect(ObserverMock.instances).toHaveLength(2);
    expect(first).toHaveAttribute("data-teacher-revealed", "true");
    expect(second).not.toHaveAttribute("data-teacher-revealed");
    expect(container.querySelector("main")).toHaveAttribute("data-motion-ready", "true");
  });

  it("cleans up observers and media listeners", () => {
    const { unmount } = fixture();
    unmount();
    expect(ObserverMock.instances[0].disconnect).toHaveBeenCalled();
    expect(preference.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
