import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routeAdventureDemoCardModel } from "@/lib/example-card";
import { FinalCard } from "./final-card";

describe("FinalCard route footer", () => {
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
