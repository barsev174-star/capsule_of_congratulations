import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  getPresentation: vi.fn()
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/lib/public-shares/service", () => ({
  getPublicSharePayload: mocks.getPayload,
  getPublicSharePresentation: mocks.getPresentation
}));
vi.mock("@/components/templates/template-card-renderer", () => ({
  TemplateCardRenderer: (props: { dispatch: { kind: string }; surface?: string; mode?: string }) => (
    <div data-testid="template-renderer" data-kind={props.dispatch.kind} data-surface={props.surface} data-mode={props.mode} />
  )
}));
vi.mock("@/components/telemetry/journey-event", () => ({ JourneyEvent: () => null }));
vi.mock("./share-actions", () => ({ ShareActions: () => <div data-testid="share-actions" /> }));

import PublicSharePage from "./page";

describe("PublicSharePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes a v2 presentation to universal-v1 without a legacy mode", async () => {
    mocks.getPresentation.mockResolvedValue({
      kind: "universal-v1",
      dispatch: { kind: "universal-v1", registration: { profile: {} } },
      model: {},
      publicName: "Александра"
    });

    render(await PublicSharePage({ params: Promise.resolve({ token: "public-token" }) }));

    expect(screen.getByTestId("template-renderer")).toHaveAttribute("data-kind", "universal-v1");
    expect(screen.getByTestId("template-renderer")).toHaveAttribute("data-surface", "public");
    expect(screen.getByTestId("template-renderer")).not.toHaveAttribute("data-mode", "public");
    expect(screen.getByTestId("share-actions")).toBeInTheDocument();
  });

  it("keeps a v1 presentation on the legacy public mode", async () => {
    mocks.getPresentation.mockResolvedValue({
      kind: "legacy",
      dispatch: { kind: "legacy", registration: {} },
      model: {},
      publicName: "Александра"
    });

    render(await PublicSharePage({ params: Promise.resolve({ token: "public-token" }) }));

    expect(screen.getByTestId("template-renderer")).toHaveAttribute("data-kind", "legacy");
    expect(screen.getByTestId("template-renderer")).toHaveAttribute("data-mode", "public");
  });
});
