import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startCaregiverCardFromShowcaseAction: vi.fn(),
  sendClientTelemetry: vi.fn(),
  getCaregiverTelemetryContext: vi.fn(() => ({
    landing_type: "caregiver",
    landing_path: "/gruppovaya-otkrytka/vospitatelyu"
  }))
}));

vi.mock("@/app/home-actions", () => ({
  startCaregiverCardFromShowcaseAction: mocks.startCaregiverCardFromShowcaseAction
}));
vi.mock("@/lib/client-telemetry", () => ({
  sendClientTelemetry: mocks.sendClientTelemetry
}));
vi.mock("@/lib/client-landing-attribution", () => ({
  getCaregiverTelemetryContext: mocks.getCaregiverTelemetryContext
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { CaregiverCreateForm, CaregiverExampleLink } from "./caregiver-landing-client";

describe("caregiver landing client actions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the kindergarten-doodles example and reports the template", () => {
    render(<CaregiverExampleLink>Посмотреть пример</CaregiverExampleLink>);

    const link = screen.getByRole("link", { name: "Посмотреть пример" });
    expect(link).toHaveAttribute("href", "/example?template=kindergarten-doodles");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);

    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_example_click", {
      landing_type: "caregiver",
      landing_path: "/gruppovaya-otkrytka/vospitatelyu",
      template: "kindergarten-doodles"
    });
  });

  it("reports kindergarten-doodles when a caregiver card is submitted", () => {
    render(<CaregiverCreateForm placement="final">Создать открытку</CaregiverCreateForm>);
    fireEvent.submit(screen.getByRole("button", { name: "Создать открытку" }).closest("form")!);

    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_create_click", {
      landing_type: "caregiver",
      landing_path: "/gruppovaya-otkrytka/vospitatelyu",
      placement: "final",
      template: "kindergarten-doodles"
    });
  });
});
