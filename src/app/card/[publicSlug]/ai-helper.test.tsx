import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AiHelper } from "./ai-helper";

describe("AiHelper form integration", () => {
  it("does not create a nested form inside the contribution form", () => {
    const { container } = render(
      <form>
        <AiHelper
          cardId="card_test"
          publicSlug="test-card"
          occasionText="С днём рождения!"
          messageLimit={500}
          onUseText={vi.fn()}
          variant="join"
        />
      </form>
    );

    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector("button[type='button']")).toHaveTextContent("Получить 3 варианта");
  });
});
