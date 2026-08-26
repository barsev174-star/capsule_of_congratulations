import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendClientTelemetry: vi.fn(),
  startBirthdayCardFromShowcaseAction: vi.fn(),
  getBirthdayTelemetryContext: vi.fn(() => ({ landing_type: "birthday", landing_path: "/gruppovaya-otkrytka/den-rozhdeniya" }))
}));
vi.mock("@/lib/client-telemetry", () => ({ sendClientTelemetry: mocks.sendClientTelemetry }));
vi.mock("@/lib/client-landing-attribution", () => ({ getBirthdayTelemetryContext: mocks.getBirthdayTelemetryContext }));
vi.mock("@/app/home-actions", () => ({ startBirthdayCardFromShowcaseAction: mocks.startBirthdayCardFromShowcaseAction }));

import { BirthdayCreateForm, BirthdayExampleLink, BirthdayLandingTracker } from "./birthday-landing-client";

describe("birthday landing interactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tracks a single view and opens the matching family scenario", () => {
    const { rerender } = render(<><BirthdayLandingTracker /><BirthdayExampleLink>Пример</BirthdayExampleLink></>);
    rerender(<><BirthdayLandingTracker /><BirthdayExampleLink>Пример</BirthdayExampleLink></>);
    expect(mocks.sendClientTelemetry).toHaveBeenCalledTimes(1);
    const example = screen.getByRole("link", { name: "Пример" });
    expect(example).toHaveAttribute("href", "/example?template=paper-birthday&scenario=birthday");
    fireEvent.click(example);
    expect(mocks.sendClientTelemetry).toHaveBeenLastCalledWith("seo_example_click", expect.objectContaining({ landing_type: "birthday", template: "paper-birthday" }));
  });

  it.each(["hero", "example", "final"] as const)("creates a birthday card from %s", async (placement) => {
    render(<BirthdayCreateForm placement={placement}>Создать</BirthdayCreateForm>);
    fireEvent.submit(screen.getByRole("button", { name: "Создать" }).closest("form")!);
    await waitFor(() => expect(mocks.startBirthdayCardFromShowcaseAction).toHaveBeenCalledTimes(1));
    expect(mocks.sendClientTelemetry).toHaveBeenCalledWith("seo_create_click", expect.objectContaining({ landing_type: "birthday", placement, template: "paper-birthday" }));
  });

  it("keeps the travel alternative separate", () => {
    render(<BirthdayExampleLink alternative placement="moments">Маршрут</BirthdayExampleLink>);
    const link = screen.getByRole("link", { name: "Маршрут" });
    expect(link).toHaveAttribute("href", "/example?template=route-adventure");
    fireEvent.click(link);
    expect(mocks.sendClientTelemetry).toHaveBeenLastCalledWith("seo_example_click", expect.objectContaining({ template: "route-adventure", placement: "moments" }));
  });
});
