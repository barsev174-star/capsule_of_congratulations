import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
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

const demo = (initialTemplateId: DemoTemplateId) => (
  <ExampleExperience
    initialTemplateId={initialTemplateId}
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
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
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
});
