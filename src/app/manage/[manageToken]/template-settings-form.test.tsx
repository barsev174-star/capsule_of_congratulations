import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateSettingsForm } from "./template-settings-form";

vi.mock("./actions", () => ({
  updateCardTemplateAction: vi.fn()
}));

const templates = [
  {
    id: "paper-birthday" as const,
    name: "Бумажный классический",
    description: "Тёплая бумажная открытка"
  },
  {
    id: "route-adventure" as const,
    name: "Маршрут",
    description: "Путешествие по важным моментам"
  }
];

describe("TemplateSettingsForm", () => {
  it("distinguishes the template in use from a new selection", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSettingsForm
        manageToken="manage-token"
        templates={templates}
        currentTemplateId="paper-birthday"
      />
    );

    const current = screen.getByRole("radio", { name: /Бумажный классический/ });
    expect(current).toBeChecked();
    expect(screen.getByText("Используется")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Этот шаблон уже используется" })).toBeDisabled();

    const route = screen.getByRole("radio", { name: /Маршрут/ });
    await user.click(route);

    expect(screen.getByText("Используется")).toBeInTheDocument();
    expect(screen.getByText("Будет применён шаблон «Маршрут»")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Применить шаблон" })).toBeEnabled();
    expect(route.closest("label")).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
