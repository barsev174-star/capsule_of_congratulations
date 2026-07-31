import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateSummary } from "./template-summary";

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

describe("TemplateSummary", () => {
  it("combines animation details with the template and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
      />
    );

    expect(screen.getByText("Анимация: конверт с открыткой")).toBeInTheDocument();
    const opener = screen.getByRole("button", { name: "Выбрать другой шаблон" });
    await user.click(opener);

    expect(screen.getByRole("dialog", { name: "Выберите шаблон" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Закрыть выбор шаблона" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Выберите шаблон" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
