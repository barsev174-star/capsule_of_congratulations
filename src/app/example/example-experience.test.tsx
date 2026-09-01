import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  startCardFromExampleSelectionAction: vi.fn()
}));
const telemetry = vi.hoisted(() => ({ sendClientTelemetry: vi.fn() }));

vi.mock("../home-actions", () => actions);
vi.mock("@/lib/client-telemetry", () => telemetry);
vi.mock("@/components/scroll-reveal/scroll-reveal", () => ({
  ScrollReveal: ({ children }: { children: ReactNode }) => <>{children}</>,
  useScrollReveal: () => ({ ref: { current: null }, style: {} })
}));

import { ExampleExperience, type DemoTemplateId } from "./example-experience";

const demo = (initialTemplateId: DemoTemplateId, birthdayScenario = false, previewPhotoCount: 0 | 1 | 2 | 3 = 3) => (
  <ExampleExperience
    birthdayScenario={birthdayScenario}
    initialTemplateId={initialTemplateId}
    previewPhotoCount={previewPhotoCount}
    routeChildren={null}
    schoolChildren={null}
    schoolClassicChildren={null}
    kindergartenDoodlesChildren={null}
    teamEditorialChildren={null}
  >{null}</ExampleExperience>
);

describe("example creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["Создать такую же", "hero"],
    ["Создать открытку", "bottom_cta"]
  ] as const)("submits the selected template and reveal for %s", async (label, placement) => {
    render(demo("team-editorial"));
    fireEvent.click(screen.getByRole("radio", { name: /Конверт/ }));
    fireEvent.submit(screen.getByRole("button", { name: label, exact: true }).closest("form")!);
    await waitFor(() => expect(actions.startCardFromExampleSelectionAction).toHaveBeenCalledTimes(1));
    const submitted = actions.startCardFromExampleSelectionAction.mock.calls[0][0] as FormData;
    expect(submitted.get("templateId")).toBe("team-editorial");
    expect(submitted.get("giftAnimationId")).toBe("envelope");
    expect(telemetry.sendClientTelemetry).toHaveBeenCalledWith("demo_create_clicked", {
      route: "/example",
      source: "demo_page",
      placement,
      template: "team-editorial",
      animation: "envelope"
    });
  });

  it("offers the new collect animation and launches it with six message previews", () => {
    render(demo("paper-birthday"));

    const collectChoice = screen.getByRole("radio", { name: /Собрать поздравления/ });
    expect(collectChoice).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Посмотреть анимацию" }));

    expect(document.querySelector('[data-animation-id="collect-messages"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-count="6"]')).toBeInTheDocument();
  });

  it("explains both reveal options as readable three-stage stories", () => {
    render(demo("paper-birthday"));

    expect(document.querySelectorAll('[data-preview-story="envelope"] [data-preview-stage]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-preview-story="collect-messages"] [data-preview-stage]')).toHaveLength(3);
    expect(screen.getByText("Открытка выходит")).toBeInTheDocument();
    expect(screen.getByText("Готовая открытка")).toBeInTheDocument();
  });

  it("still lets the viewer switch the example back to the envelope", () => {
    render(demo("paper-birthday"));

    fireEvent.click(screen.getByRole("radio", { name: /Конверт/ }));
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть анимацию" }));

    expect(document.querySelector('[data-animation-id="envelope"]')).toBeInTheDocument();
  });

  it("supports arrow-key selection in the reveal radio group", () => {
    render(demo("paper-birthday"));

    const collectChoice = screen.getByRole("radio", { name: /Собрать поздравления/ });
    fireEvent.keyDown(collectChoice, { key: "ArrowLeft" });

    expect(screen.getByRole("radio", { name: /Конверт/ })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps step three summary compact and omits the obsolete dot navigation", () => {
    render(demo("paper-birthday"));

    expect(screen.getByLabelText("Выбранные параметры демонстрации"))
      .toHaveTextContent("Бумажный классический·Собрать поздравления");
    expect(screen.queryByRole("navigation", { name: "Шаги демонстрации" })).not.toBeInTheDocument();
  });

  it("uses the real recipient preview route and updates it with the selected template", () => {
    render(demo("school-scrapbook"));

    const previewFrame = document.querySelector('iframe[src*="recipient-preview"]');
    expect(previewFrame)
      .toHaveAttribute("src", "/example/recipient-preview?template=school-scrapbook");
    expect(previewFrame).toHaveAttribute("scrolling", "no");

    fireEvent.click(screen.getByRole("button", { name: /Маршрут/ }));

    expect(document.querySelector('iframe[src*="recipient-preview"]'))
      .toHaveAttribute("src", "/example/recipient-preview?template=route-adventure");
  });

  it.each([0, 1, 3] as const)("supports the ?photos=%s visual QA variant", (photoCount) => {
    render(demo("paper-birthday", false, photoCount));
    fireEvent.click(screen.getByRole("button", { name: "Посмотреть анимацию" }));
    expect(document.querySelector('[data-animation-id="collect-messages"] [data-photo-count]'))
      .toHaveAttribute("data-photo-count", String(photoCount));
  });

  it("opens the birthday envelope directly with the family sender", () => {
    render(demo("paper-birthday", true));
    expect(screen.getByRole("button", { name: "Посмотреть, что внутри" })).toBeInTheDocument();
    expect(screen.getAllByText("от друзей и семьи").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Выберите пример открытки" })).not.toBeInTheDocument();
  });
});
