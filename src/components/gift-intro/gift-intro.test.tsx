import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftIntro } from "./gift-intro";

const assemblyPreview = {
  headline: "Спасибо за тепло, поддержку и множество прекрасных моментов.",
  phrases: ["Вы вдохновляете нас", "Столько важных слов", "С теплом от всей команды"],
  photos: [
    { id: "photo-1", src: "/photo-1.jpg", alt: "Общее фото" },
    { id: "photo-2", src: "/photo-2.jpg", alt: "Фото с праздника" },
    { id: "photo-3", src: "/photo-3.jpg", alt: "Памятный момент" }
  ]
};

const stubMotionPreference = (matches: boolean) => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
};

describe("GiftIntro", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMotionPreference(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.style.overflow = "";
  });

  it("runs the staged reveal and mounts the full card behind the assembly handoff", () => {
    render(
      <GiftIntro recipientName="Анна" templateId="route-adventure" assemblyPreview={assemblyPreview}>
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    expect(document.querySelector('[data-intro-state="idle"]')).toBeInTheDocument();
    expect(screen.queryByTestId("full-final-card")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-gift-intro-preview="lightweight"]')).toHaveLength(1);
    expect(document.querySelectorAll('img[src*="envelope-closed.png"]')).toHaveLength(1);
    expect(document.querySelectorAll('img[src*="envelope-open.png"]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-closed-envelope-artwork="true"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-envelope-flap="true"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-envelope-seal-artwork="true"]')).toHaveLength(1);
    expect(document.querySelector('[data-envelope-pocket-mask="true"]')).toBeInTheDocument();
    expect(document.querySelector('[data-seal-glint="true"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Открыть конверт для Анна" })).toBeInTheDocument();
    const cardInsideEnvelope = document.querySelector("[data-photo-count]");
    const upperFold = document.querySelector('[data-fold-panel="upper"]');

    expect(document.querySelector('[data-card-face="address"]')).toContainElement(
      document.querySelector('[data-gift-intro-preview="lightweight"]')
    );
    expect(document.querySelector('[data-card-face="template"]')).toContainElement(
      document.querySelector('[data-card-face="template"] [data-template-foundation="route-adventure"]')
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));
    expect(document.querySelector('[data-intro-state="intro"]')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(220));
    expect(document.querySelector('[data-intro-state="releasing-seal"]')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(210));
    expect(document.querySelector('[data-intro-state="opening-envelope"]')).toBeInTheDocument();
    expect(document.querySelector("[data-photo-count]")).toBe(cardInsideEnvelope);

    act(() => vi.advanceTimersByTime(860));
    expect(document.querySelector('[data-intro-state="extracting-card"]')).toBeInTheDocument();
    expect(document.querySelector("[data-photo-count]")).toBe(cardInsideEnvelope);

    act(() => vi.advanceTimersByTime(880));
    expect(document.querySelector('[data-intro-state="unfolding-card"]')).toBeInTheDocument();
    expect(document.querySelector('[data-fold-panel="upper"]')).toBe(upperFold);
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(screen.getByTestId("full-final-card").parentElement).toHaveAttribute("aria-hidden", "true");

    act(() => vi.advanceTimersByTime(1020));
    expect(document.querySelector('[data-intro-state="assembling-card"]')).toBeInTheDocument();
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(screen.getByTestId("full-final-card").parentElement).toHaveAttribute("aria-hidden", "true");

    act(() => vi.advanceTimersByTime(1940));
    expect(document.querySelector('[data-intro-state="handoff"]')).toBeInTheDocument();
    expect(screen.getByTestId("full-final-card").parentElement).toHaveAttribute("aria-hidden", "false");

    act(() => vi.advanceTimersByTime(1530));
    expect(document.querySelector("[data-intro-state]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
    expect(screen.getAllByTestId("full-final-card")).toHaveLength(1);
  });

  it("renders the semantic assembly from the supplied photos and phrases", () => {
    render(
      <GiftIntro recipientName="Анна" templateId="paper-birthday" assemblyPreview={assemblyPreview}>
        <div>Полная открытка</div>
      </GiftIntro>
    );

    expect(screen.getByText(assemblyPreview.headline)).toBeInTheDocument();
    expect(document.querySelector('[data-visual-preset="paper-celebration"]')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-paper-foundation="sheet"]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-template-foundation="paper-birthday"] [class*="templatePhotoSlot"]')).toHaveLength(0);
    assemblyPreview.phrases.forEach((phrase) => expect(screen.getByText(phrase)).toBeInTheDocument());
    assemblyPreview.photos.forEach((photo) => expect(screen.getByAltText(photo.alt)).toBeInTheDocument());
  });

  it("starts the same sequence when the envelope itself is pressed", () => {
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview}>
        <div>Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: "Открыть конверт для Анна" }));

    expect(document.querySelector('[data-intro-state="intro"]')).toBeInTheDocument();
  });

  it.each([
    ["route-adventure", "expedition", "История нашего пути", ["map", "compass", "stamp", "carabiner"]],
    ["school-scrapbook", "school-playful", "Школьная открытка", ["backpack", "globe", "student", "student-girl"]],
    ["school-classic", "school-formal", "Открытка учителю", ["board", "bouquet", "gold-rule", "seal"]],
    ["kindergarten-doodles", "caregiver-playful", "С любовью от детей", ["drawing", "still-life", "blue-paper", "yellow-paper"]],
    ["team-editorial", "editorial", "Открытка от команды", ["notebook", "envelope", "teal-block", "orange-block"]]
  ] as const)("uses the layered visual foundation for %s", (templateId, visualPreset, eyebrow, artLayers) => {
    render(
      <GiftIntro recipientName="Анна" templateId={templateId} visualPreset={visualPreset} assemblyPreview={assemblyPreview}>
        <div>Полная открытка</div>
      </GiftIntro>
    );

    expect(document.querySelectorAll(`[data-template-visual="${visualPreset}"]`)).toHaveLength(3);
    artLayers.forEach((layer) => {
      expect(document.querySelectorAll(`[data-template-visual="${visualPreset}"] [data-foundation-art="${layer}"]`)).toHaveLength(3);
    });
    expect(document.querySelectorAll(`[data-template-foundation="${templateId}"] [class*="templatePhotoSlot"]`)).toHaveLength(0);
    expect(screen.getByText(eyebrow)).toBeInTheDocument();
  });

  it("adapts the assembly without inventing missing photos or phrases", () => {
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={{ headline: "Тёплые слова для Анны", photos: [], phrases: [] }}>
        <div>Полная открытка</div>
      </GiftIntro>
    );

    expect(document.querySelector('[data-photo-count="0"]')).toHaveAttribute("data-phrase-count", "0");
    expect(document.querySelector("[class*='assemblyPhotos']")).toBeEmptyDOMElement();
    expect(screen.getByText("Тёплые слова для Анны")).toBeInTheDocument();
  });

  it("adds scrapbook decor only to the lightweight scrapbook preview", () => {
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

    expect(document.querySelectorAll('[data-template-id="school-scrapbook"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-school-preview-decor="boy"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-school-preview-decor="girl"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-school-preview-decor="sticker"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-school-preview-decor="tape"]')).toHaveLength(1);
  });

  it("renders the classic preview without scrapbook tape or sticker", () => {
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

    expect(document.querySelectorAll('[data-preview-preset="classic"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-classic-preview-decor="board"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-classic-preview-decor="bouquet"]')).toHaveLength(1);
    expect(document.querySelectorAll("[data-school-preview-decor]")).toHaveLength(0);
  });

  it("skips immediately and keeps replay available", () => {
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview}>
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));

    expect(document.querySelector("[data-intro-state]")).not.toBeInTheDocument();
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
  });

  it.each([
    ["intro", 100],
    ["seal release", 300],
    ["envelope opening", 650],
    ["card extraction", 1500],
    ["card unfolding", 2400],
    ["assembly", 3400],
    ["handoff", 5300]
  ])("cleans up safely when skipped during %s", (_phase, elapsed) => {
    const onIntroDone = vi.fn();
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview} onIntroDone={onIntroDone}>
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));
    act(() => vi.advanceTimersByTime(elapsed));
    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
    act(() => vi.advanceTimersByTime(10_000));

    expect(document.querySelector("[data-intro-state]")).not.toBeInTheDocument();
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();
    expect(onIntroDone).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe("");
  });

  it("replays the same intro without duplicating the full card", () => {
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview}>
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: "Пропустить" }));
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть ещё раз" }));

    expect(document.querySelector('[data-intro-state="idle"]')).toBeInTheDocument();
    expect(screen.queryByTestId("full-final-card")).not.toBeInTheDocument();
  });

  it("uses a short fade instead of the complex sequence for reduced motion", () => {
    stubMotionPreference(true);
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview}>
        <div data-testid="full-final-card">Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));

    expect(document.querySelector('[data-intro-state="handoff"]')).toHaveAttribute("data-motion-mode", "reduced");
    expect(screen.getByTestId("full-final-card")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(420));
    expect(document.querySelector("[data-intro-state]")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Посмотреть ещё раз" })).toBeInTheDocument();
  });

  it("runs the full sequence when motion is explicitly forced", () => {
    stubMotionPreference(true);
    render(
      <GiftIntro recipientName="Анна" assemblyPreview={assemblyPreview} forceFullMotion>
        <div>Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));

    expect(document.querySelector('[data-intro-state="intro"]')).toHaveAttribute("data-motion-mode", "full");
    act(() => vi.advanceTimersByTime(220));
    expect(document.querySelector('[data-intro-state="releasing-seal"]')).toBeInTheDocument();
  });

  it("keeps the previous intro available as an executable legacy variant", () => {
    render(
      <GiftIntro recipientName="Анна" variant="legacy">
        <div>Полная открытка</div>
      </GiftIntro>
    );

    fireEvent.click(screen.getByRole("button", { name: /посмотреть, что внутри/i }));

    expect(document.querySelector('[data-intro-state="playing"]')).toBeInTheDocument();
  });
});
