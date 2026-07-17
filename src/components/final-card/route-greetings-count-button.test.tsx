import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteGreetingsCountButton } from "./route-greetings-count-button";

describe("Route greetings count button", () => {
  it("is a button for a positive count and uses the correct Russian plural", () => {
    render(<RouteGreetingsCountButton count={11} />);

    expect(screen.getByRole("button", { name: "Показать все 11 поздравлений" })).toBeInTheDocument();
  });

  it("is inactive when there are no greetings", () => {
    render(<RouteGreetingsCountButton count={0} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Пока нет поздравлений")).toBeInTheDocument();
  });
});
