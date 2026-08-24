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

  it("добавляет озорной школьный декор только в облегчённую миниатюру школьного шаблона", () => {
    render(
      <GiftIntro
        recipientName="Наталья Афанасьевна"
        previewKicker="Открытка"
        previewPreset="scrapbook"
        previewDecor={[
          "/templates/school-scrapbook/decor-closing-student-doodle-v1.webp",
          "/templates/school-scrapbook/decor-closing-student-girl-doodle-v3.webp"
        ]}
        templateId="school-scrapbook"
      >
        <div>Полная открытка</div>
      </GiftIntro>
    );

    expect(document.querySelectorAll('[data-template-id="school-scrapbook"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-school-preview-decor="boy"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-school-preview-decor="girl"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-school-preview-decor="sticker"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-school-preview-decor="tape"]')).toHaveLength(2);
    expect(screen.getAllByText("Открытка")).toHaveLength(2);
    expect(screen.queryByText("Открытка для")).not.toBeInTheDocument();
  });

  it("показывает классическую школьную миниатюру без коллажного скотча и значка 5+", () => {
    render(
      <GiftIntro
        recipientName="Анна Сергеевна"
        previewKicker="Открытка учителю"
        previewPreset="classic"
        previewDecor={[
          "/templates/school-classic/decor-hero-left-v4.webp",
          "/templates/school-classic/decor-hero-right-v3.webp"
        ]}
        templateId="school-classic"
      >
        <div>Полная открытка</div>
      </GiftIntro>
    );

    expect(document.querySelectorAll('[data-template-id="school-classic"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-preview-preset="classic"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-classic-preview-decor="board"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-classic-preview-decor="bouquet"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-school-preview-decor]')).toHaveLength(0);
    expect(screen.getAllByText("Открытка учителю")).toHaveLength(2);
    expect(screen.queryByText("5+")).not.toBeInTheDocument();
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

  it("по явному нажатию показывает полное раскрытие даже при reduced motion", () => {
    vi.useFakeTimers();
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

    expect(document.querySelector('[data-intro-state="playing"]')).toBeInTheDocument();
    expect(screen.queryByTestId("full-final-card")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(3550));
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Посмотреть ещё раз" })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1250));
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
  });
});
