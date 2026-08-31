import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  startBirthdayCardFromShowcaseAction: vi.fn(),
  startCardFromShowcaseAction: vi.fn(),
  startColleagueCardFromShowcaseAction: vi.fn()
}));

vi.mock("../home-actions", () => actions);
vi.mock("@/lib/client-telemetry", () => ({ sendClientTelemetry: vi.fn() }));
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

  it.each(["Создать такую же", "Создать открытку"])("preserves the team template for %s", async (label) => {
    render(demo("team-editorial"));
    fireEvent.submit(screen.getByRole("button", { name: label, exact: true }).closest("form")!);
    await waitFor(() => expect(actions.startColleagueCardFromShowcaseAction).toHaveBeenCalledTimes(1));
    expect(actions.startCardFromShowcaseAction).not.toHaveBeenCalled();
  });

  it("keeps the generic action when another template is selected", async () => {
    render(demo("team-editorial"));
    fireEvent.click(screen.getByRole("button", { name: /Бумажный классический/ }));
    fireEvent.submit(screen.getByRole("button", { name: "Создать такую же", exact: true }).closest("form")!);
    await waitFor(() => expect(actions.startCardFromShowcaseAction).toHaveBeenCalledTimes(1));
    expect(actions.startColleagueCardFromShowcaseAction).not.toHaveBeenCalled();
  });

  it("offers the new collect animation and launches it with six message previews", () => {
    render(demo("paper-birthday"));

    const collectChoice = screen.getByRole("button", { name: /Собрать поздравления/ });
    expect(collectChoice).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Запустить анимацию" }));

    expect(document.querySelector('[data-animation-id="collect-messages"]')).toBeInTheDocument();
    expect(document.querySelector('[data-message-count="6"]')).toBeInTheDocument();
  });

  it("still lets the viewer switch the example back to the envelope", () => {
    render(demo("paper-birthday"));

    fireEvent.click(screen.getByRole("button", { name: "Конверт", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Запустить анимацию" }));

    expect(document.querySelector('[data-animation-id="envelope"]')).toBeInTheDocument();
  });

  it.each([0, 1, 3] as const)("supports the ?photos=%s visual QA variant", (photoCount) => {
    render(demo("paper-birthday", false, photoCount));
    fireEvent.click(screen.getByRole("button", { name: "Запустить анимацию" }));
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
