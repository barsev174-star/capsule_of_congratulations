import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exampleCardModel, routeAdventureDemoCardModel } from "@/lib/example-card";
import { FinalCard } from "./final-card";

describe("FinalCard route footer", () => {
  beforeAll(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })));
  });

  afterAll(() => vi.unstubAllGlobals());

  it.each([
    ["route-adventure", routeAdventureDemoCardModel],
    ["paper-birthday", exampleCardModel]
  ] as const)(
    "shows the total private photo count in the %s card header",
    (_style, model) => {
      const { container } = render(<FinalCard model={model} />);
      const expectedCount = model.messageMediaAssets.length + model.memoryMediaAssets.length;

      expect(container.querySelector('[data-hero-stat="photos"]')).toHaveTextContent(`${expectedCount}фото`);
    }
  );

  it("renders the actual route signature as one handwritten block without a fallback phrase", () => {
    const footerSignature = "От тех, кто тебя ценит";
    const { container } = render(
      <FinalCard
        model={{
          ...routeAdventureDemoCardModel,
          footerSignature,
          blocks: [{ id: "closing", required: true }]
        }}
      />
    );

    expect(screen.getByText(footerSignature)).toBeInTheDocument();
    expect(screen.queryByText(/С теплом/i)).not.toBeInTheDocument();
    expect(container.querySelector("[class*='routeFooterSign']")).toHaveTextContent(footerSignature);
  });
});
