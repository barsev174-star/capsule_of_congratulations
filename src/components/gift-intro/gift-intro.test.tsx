import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftIntro } from "./gift-intro";

describe("GiftIntro rendering budget", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("keeps the full final card unmounted until the reveal and renders it only once", () => {
    vi.useFakeTimers();
    render(
      <GiftIntro recipientName="Анна" templateId="route-adventure">
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    expect(screen.queryByTestId("full-final-card")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-gift-intro-preview="lightweight"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));
    act(() => vi.advanceTimersByTime(3550));

    expect(screen.getAllByTestId("full-final-card")).toHaveLength(1);
    expect(document.querySelectorAll('[data-gift-intro-preview="lightweight"]')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(1250));
    expect(screen.getAllByTestId("full-final-card")).toHaveLength(1);
    expect(document.querySelectorAll('[data-gift-intro-preview="lightweight"]')).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
  });

  it("повторно запускает ту же заставку", () => {
    vi.useFakeTimers();
    render(
      <GiftIntro recipientName="Анна" templateId="paper-birthday">
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));
    act(() => vi.advanceTimersByTime(4800));
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть ещё раз" }));

    expect(screen.getByRole("button", { name: /посмотреть, что внутри/i })).toBeInTheDocument();
    expect(screen.queryByTestId("full-final-card")).not.toBeInTheDocument();
  });

  it("при reduced motion открывает открытку без длинной анимации", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    render(
      <GiftIntro recipientName="Анна" templateId="paper-birthday">
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));

    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
  });
});
