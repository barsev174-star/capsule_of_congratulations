import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContributionsStrip, type ContributionStripItem } from "./contributions-strip";

const items: ContributionStripItem[] = Array.from({ length: 7 }, (_, index) => ({
  id: `contribution-${index + 1}`,
  authorName: `Участник ${index + 1}`,
  authorRole: index === 0 ? "мама Миши" : null,
  message: `Тёплое поздравление номер ${index + 1}`
}));

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ContributionsStrip", () => {
  it("передаёт в основной список все поздравления и помечает клоны скрытыми", () => {
    const { container } = render(<ContributionsStrip items={items} />);

    const cards = container.querySelectorAll("li");
    expect(cards).toHaveLength(15);
    expect(cards[4]).toHaveTextContent("Участник 1");
    expect(cards[10]).toHaveTextContent("Участник 7");
    expect(cards[0]).toHaveAttribute("aria-hidden", "true");
    expect(cards[11]).toHaveAttribute("aria-hidden", "true");
  });

  it("даёт карусели и стрелкам доступные имена", () => {
    render(<ContributionsStrip items={items} />);

    expect(screen.getByLabelText("Поздравления участников")).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getByRole("button", { name: "Показать предыдущее поздравление" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Показать следующее поздравление" })).toBeInTheDocument();
  });

  it("показывает имя, подпись и фрагмент поздравления отдельными строками", () => {
    render(<ContributionsStrip items={items} />);

    const name = screen.getAllByText("Участник 1")[0];
    const role = screen.getAllByText("мама Миши")[0];
    const message = screen.getAllByText("Тёплое поздравление номер 1")[0];
    expect(name).not.toBe(role);
    expect(role).not.toBe(message);
  });

  it("не показывает навигацию, когда на desktop помещаются все карточки", () => {
    render(<ContributionsStrip items={items.slice(0, 4)} />);

    expect(screen.queryByRole("button", { name: "Показать предыдущее поздравление" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Показать следующее поздравление" })).not.toBeInTheDocument();
  });

  it("не сжимает единственное поздравление в зону скрытых стрелок", () => {
    render(<ContributionsStrip items={items.slice(0, 1)} />);

    expect(screen.getByLabelText("Поздравления участников").className).toContain("contribCarouselStatic");
  });

  it("не выключает автопрокрутку от вертикального касания страницы", () => {
    vi.useFakeTimers();
    const scrollBy = vi.fn();
    const scrollTo = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 100, height: 80, top: 0, right: 100, bottom: 80, left: 0, x: 0, y: 0, toJSON: () => ({}) })
    });

    render(<ContributionsStrip items={items} />);
    const carousel = screen.getByLabelText("Поздравления участников");
    fireEvent.pointerDown(carousel, { pointerType: "touch", pointerId: 1, clientX: 40, clientY: 20 });
    fireEvent.pointerUp(carousel, { pointerType: "touch", pointerId: 1, clientX: 42, clientY: 80 });

    act(() => { vi.advanceTimersByTime(5000); });

    expect(scrollBy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("продолжает автопрокрутку без плавной анимации при reduced motion", () => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })) as unknown as typeof window.matchMedia;
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", { configurable: true, value: scrollBy });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 100, height: 80, top: 0, right: 100, bottom: 80, left: 0, x: 0, y: 0, toJSON: () => ({}) })
    });

    render(<ContributionsStrip items={items} />);
    act(() => { vi.advanceTimersByTime(5000); });

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
    vi.useRealTimers();
  });
});
