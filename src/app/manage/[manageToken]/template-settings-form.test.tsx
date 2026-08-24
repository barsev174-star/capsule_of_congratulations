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
  },
  {
    id: "school-scrapbook" as const,
    name: "Школьный коллаж",
    description: "Школьные воспоминания",
    preview: "/templates/school-scrapbook/preview.webp"
  },
  {
    id: "school-classic" as const,
    name: "Школьный классический",
    description: "Классическая открытка учителю",
    preview: "/templates/school-classic/preview-v3.webp"
  }
];

describe("TemplateSettingsForm", () => {
  it("requires an explicit first selection", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSettingsForm
        manageToken="manage-token"
        templates={templates}
        currentTemplateId={null}
      />
    );

    expect(screen.getByText("Сначала выберите шаблон")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выберите шаблон" })).toBeDisabled();
    expect(screen.getAllByRole("radio").every((radio) => !radio.hasAttribute("checked"))).toBe(true);

    await user.click(screen.getByRole("radio", { name: /Маршрут/ }));

    expect(screen.getByRole("button", { name: "Применить шаблон" })).toBeEnabled();
  });

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

  it("uses a universal template's own catalog preview", () => {
    const { container } = render(
      <TemplateSettingsForm
        manageToken="manage-token"
        templates={templates}
        currentTemplateId="school-classic"
      />
    );

    const schoolCard = screen.getByRole("radio", { name: /Школьный коллаж/ }).closest("label");
    expect(schoolCard?.querySelector("img")).toHaveAttribute(
      "src",
      "/templates/school-scrapbook/preview.webp"
    );
    const classicCard = screen.getByRole("radio", { name: /Школьный классический/ }).closest("label");
    expect(classicCard?.querySelector("img")).toHaveAttribute(
      "src",
      "/templates/school-classic/preview-v3.webp"
    );
    expect(container.querySelectorAll('img[src="/templates/warm-classic-preview.png"]')).toHaveLength(1);
  });
});
