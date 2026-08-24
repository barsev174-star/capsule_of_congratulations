import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startTeacherCardFromShowcaseAction: vi.fn(),
  sendClientTelemetry: vi.fn(),
  getTeacherTelemetryContext: vi.fn(() => ({
    landing_type: "teacher",
    landing_path: "/gruppovaya-otkrytka/uchitelyu"
  }))
}));

vi.mock("@/app/home-actions", () => ({
  startTeacherCardFromShowcaseAction: mocks.startTeacherCardFromShowcaseAction
}));
vi.mock("@/lib/client-telemetry", () => ({
  sendClientTelemetry: mocks.sendClientTelemetry
}));
vi.mock("@/lib/client-landing-attribution", () => ({
  getTeacherTelemetryContext: mocks.getTeacherTelemetryContext
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { TeacherCreateForm, TeacherExampleLink } from "./teacher-landing-client";

describe("teacher landing client actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the school-classic example and reports the selected template", () => {
    render(<TeacherExampleLink>Посмотреть пример</TeacherExampleLink>);

    const link = screen.getByRole("link", { name: "Посмотреть пример" });
    expect(link).toHaveAttribute("href", "/example?template=school-classic");

    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_example_click", {
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      template: "school-classic"
    });
  });

  it("reports school-classic when a teacher card is submitted", () => {
    render(
      <TeacherCreateForm placement="final">
        Создать открытку
      </TeacherCreateForm>
    );

    const form = screen.getByRole("button", { name: "Создать открытку" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_create_click", {
      landing_type: "teacher",
      landing_path: "/gruppovaya-otkrytka/uchitelyu",
      placement: "final",
      template: "school-classic"
    });
  });
});
