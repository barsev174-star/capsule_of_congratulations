import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GiftIntro } from "./gift-intro";

describe("GiftIntro rendering budget", () => {
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it("keeps the full final card unmounted until the reveal and renders it only once", () => {
    vi.useFakeTimers();
    render(
      <GiftIntro slug="render-budget" recipientName="Анна" templateId="route-adventure" forceIntro>
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
  });
});
