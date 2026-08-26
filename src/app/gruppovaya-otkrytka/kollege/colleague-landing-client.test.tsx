import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendClientTelemetry: vi.fn(),
  getColleagueTelemetryContext: vi.fn(() => ({
    landing_type: "colleague",
    landing_path: "/gruppovaya-otkrytka/kollege"
  })),
  startColleagueCardFromShowcaseAction: vi.fn()
}));

vi.mock("@/lib/client-telemetry", () => ({ sendClientTelemetry: mocks.sendClientTelemetry }));
vi.mock("@/lib/client-landing-attribution", () => ({ getColleagueTelemetryContext: mocks.getColleagueTelemetryContext }));
vi.mock("@/app/home-actions", () => ({ startColleagueCardFromShowcaseAction: mocks.startColleagueCardFromShowcaseAction }));

import { ColleagueCreateForm, ColleagueExampleLink, ColleagueLandingTracker } from "./colleague-landing-client";

describe("colleague landing client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tracks the page once and opens the team-editorial example", () => {
    const { rerender } = render(<><ColleagueLandingTracker /><ColleagueExampleLink>Пример</ColleagueExampleLink></>);
    rerender(<><ColleagueLandingTracker /><ColleagueExampleLink>Пример</ColleagueExampleLink></>);

    expect(mocks.sendClientTelemetry).toHaveBeenCalledTimes(1);
    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_landing_view", {
      landing_type: "colleague",
      landing_path: "/gruppovaya-otkrytka/kollege"
    });
    const link = screen.getByRole("link", { name: "Пример" });
    expect(link).toHaveAttribute("href", "/example?template=team-editorial");
    fireEvent.click(link);
    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_example_click", {
      landing_type: "colleague",
      landing_path: "/gruppovaya-otkrytka/kollege",
      template: "team-editorial"
    });
  });

  it("tracks create placement and the fixed template", () => {
    render(<ColleagueCreateForm placement="hero">Создать</ColleagueCreateForm>);
    fireEvent.submit(screen.getByRole("button", { name: "Создать" }).closest("form")!);
    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_create_click", {
      landing_type: "colleague",
      landing_path: "/gruppovaya-otkrytka/kollege",
      placement: "hero",
      template: "team-editorial"
    });
  });

  it("enables reveal and lift only for the visual example", () => {
    render(<><ColleagueExampleLink reveal>Превью</ColleagueExampleLink><ColleagueExampleLink>Обычная ссылка</ColleagueExampleLink></>);
    expect(screen.getByRole("link", { name: "Превью" })).toHaveAttribute("data-teacher-reveal");
    expect(screen.getByRole("link", { name: "Превью" })).toHaveAttribute("data-colleague-lift");
    expect(screen.getByRole("link", { name: "Обычная ссылка" })).not.toHaveAttribute("data-teacher-reveal");
  });
});
