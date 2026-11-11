import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { cardTemplates } from "@/lib/cards/templates";
import { newYearThemeCatalog } from "@/templates/new-year/catalog";
import { updateCardTemplateAction } from "./actions";
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
    preview: "/templates/school-classic/preview-v6.webp"
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
      "/templates/school-classic/preview-v6.webp"
    );
    expect(container.querySelectorAll('img[src="/templates/warm-classic-preview.png"]')).toHaveLength(1);
  });

  it.each([
    [null, "red", "green"],
    ["green", "green", "red"]
  ] as const)("uses the saved theme %s and submits the alternative as the same template", async (storedTheme, current, next) => {
    const user = userEvent.setup();
    const newYear = cardTemplates.find(({ id }) => id === "new-year")!;
    const update = vi.mocked(updateCardTemplateAction);
    update.mockClear();
    update.mockResolvedValue({ ok: true, message: "Шаблон применён.", giftAnimationId: "winter-wonder" });
    const onTemplateSelectionChange = vi.fn();
    render(
      <TemplateSettingsForm
        manageToken="manage-token"
        templates={[...templates, newYear]}
        currentTemplateId="new-year"
        currentTheme={storedTheme}
        onTemplateSelectionChange={onTemplateSelectionChange}
      />
    );

    expect(screen.queryByText("Цвет оформления")).not.toBeInTheDocument();
    const [red, green] = screen.getAllByRole("radio");
    expect(red.closest("label")?.querySelector("img")).toHaveAttribute("src", newYearThemeCatalog.red.preview);
    expect(green.closest("label")?.querySelector("img")).toHaveAttribute("src", newYearThemeCatalog.green.preview);
    const option = (id: "red" | "green") => screen.getByRole("radio", { name: new RegExp(newYearThemeCatalog[id].name) });
    expect(option(current)).toBeChecked();
    expect(option(next)).not.toBeChecked();

    await user.click(screen.getByText(newYearThemeCatalog[next].description));
    expect(option(next)).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Применить шаблон" }));

    await waitFor(() => expect(onTemplateSelectionChange).toHaveBeenCalledWith("new-year", next, "winter-wonder"));
    const submitted = update.mock.calls[0][1];
    expect(submitted.get("templateId")).toBe("new-year");
    expect(submitted.get("templateTheme")).toBe(next);
  });
});
