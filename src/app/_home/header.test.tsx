import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startCardFromShowcaseAction: vi.fn(),
  startTeacherCardFromShowcaseAction: vi.fn(),
  sendClientTelemetry: vi.fn(),
  getTeacherTelemetryContext: vi.fn(() => ({
    landing_type: "teacher",
    landing_path: "/gruppovaya-otkrytka/uchitelyu"
  }))
}));

vi.mock("../home-actions", () => ({
  startCardFromShowcaseAction: mocks.startCardFromShowcaseAction,
  startTeacherCardFromShowcaseAction: mocks.startTeacherCardFromShowcaseAction
}));
vi.mock("@/lib/client-telemetry", () => ({
  sendClientTelemetry: mocks.sendClientTelemetry
}));
vi.mock("@/lib/client-landing-attribution", () => ({
  getTeacherTelemetryContext: mocks.getTeacherTelemetryContext
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { HomeHeader } from "./header";

describe("HomeHeader teacher variant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the school-classic example and teacher telemetry", () => {
    render(<HomeHeader variant="teacher" />);

    expect(screen.getByRole("link", { name: "Пример" }))
      .toHaveAttribute("href", "/example?template=school-classic");
    const button = screen.getByRole("button", { name: "Создать открытку" });
    fireEvent.submit(button.closest("form")!);

    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_create_click", {
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      placement: "hero",
      template: "school-classic"
    });
  });

  it("keeps the home header generic", () => {
    render(<HomeHeader />);

    expect(screen.getByRole("link", { name: "Примеры" }))
      .toHaveAttribute("href", "/example");
    fireEvent.submit(screen.getByRole("button", { name: "Создать открытку" }).closest("form")!);
    expect(mocks.sendClientTelemetry).not.toHaveBeenCalled();
  });
});
