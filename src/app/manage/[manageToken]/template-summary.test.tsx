import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateSummary } from "./template-summary";

vi.mock("./actions", () => ({
  updateCardTemplateAction: vi.fn(),
  updateGiftAnimationAction: vi.fn().mockResolvedValue({ ok: true, message: "Способ вручения применён." })
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
  },
  {
    id: "northern-light" as const,
    name: "Северное сияние",
    description: "Светлая история о важных людях",
    preview: "/templates/northern-light/preview.webp"
  }
];

describe("TemplateSummary", () => {
  it("starts without an automatically selected template", () => {
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId={null}
        initialAnimationId="envelope"
      />
    );

    expect(screen.getByText("Шаблон не выбран")).toBeInTheDocument();
    expect(screen.getByText("Это обязательный шаг перед открытием сбора.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выбрать шаблон" })).toBeInTheDocument();
    expect(screen.queryByText("Анимация: конверт с открыткой")).not.toBeInTheDocument();
  });

  it("combines animation details with the template and restores focus after Escape", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    expect(screen.getByText("Конверт с открыткой")).toBeInTheDocument();
    expect(screen.getByText("Собрать поздравления")).toBeInTheDocument();
    const opener = screen.getByRole("button", { name: "Выбрать другой шаблон" });
    await user.click(opener);

    expect(screen.getByRole("dialog", { name: "Выберите шаблон" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Закрыть выбор шаблона" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Выберите шаблон" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("shows a generated universal template preview without a template-id branch", () => {
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="northern-light"
        initialAnimationId="collect-messages"
      />
    );

    expect(screen.getByRole("img", { name: "Северное сияние" })).toHaveAttribute(
      "src",
      "/templates/northern-light/preview.webp"
    );
    expect(screen.getAllByText("Светлая история о важных людях").length).toBeGreaterThan(0);
  });
});
