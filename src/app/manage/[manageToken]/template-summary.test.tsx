import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateSummary } from "./template-summary";

const actions = vi.hoisted(() => ({
  updateCardTemplateAction: vi.fn(),
  updateGiftAnimationAction: vi.fn()
}));
const telemetry = vi.hoisted(() => ({ sendClientTelemetry: vi.fn() }));

vi.mock("./actions", () => ({
  updateCardTemplateAction: actions.updateCardTemplateAction,
  updateGiftAnimationAction: actions.updateGiftAnimationAction
}));
vi.mock("@/lib/client-telemetry", () => telemetry);

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
  beforeEach(() => {
    actions.updateGiftAnimationAction.mockReset();
    actions.updateGiftAnimationAction.mockResolvedValue({ ok: true, message: "Способ открытия сохранён." });
    telemetry.sendClientTelemetry.mockReset();
  });

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

  it("keeps the sidebar compact and restores focus after closing the reveal dialog", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    expect(screen.getByText("Конверт")).toBeInTheDocument();
    expect(screen.getByText("Классическое открытие: конверт раскрывается и показывает открытку.")).toBeInTheDocument();
    expect(screen.queryByText("Собрать поздравления")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Посмотреть пример/ })).toHaveAttribute(
      "href",
      "/example?template=paper-birthday&animation=envelope"
    );
    expect(screen.getByRole("link", { name: /Посмотреть пример/ })).toHaveAttribute("target", "_blank");

    const opener = screen.getByRole("button", { name: "Изменить" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Выберите способ открытия" });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(dialog).toHaveFocus());
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Конверт — выбрано" })).toHaveAttribute("aria-checked", "true");
    expect(document.querySelectorAll('[data-preview-story="envelope"] [data-preview-stage]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-preview-story="collect-messages"] [data-preview-stage]')).toHaveLength(3);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Выберите способ открытия" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("previews an alternative reveal without changing or saving the current setting", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    await user.click(screen.getByRole("button", { name: "Изменить" }));
    const collectChoice = screen.getByRole("radio", { name: "Собрать поздравления — выбрать" });
    const collectCard = collectChoice.closest("article");
    expect(collectCard).not.toBeNull();
    const preview = within(collectCard!).getByRole("link", { name: /Посмотреть пример/ });
    expect(preview).toHaveAttribute(
      "href",
      "/example?template=paper-birthday&animation=collect-messages"
    );

    await user.click(preview);

    expect(actions.updateGiftAnimationAction).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Конверт — выбрано" })).toHaveAttribute("aria-checked", "true");
    expect(telemetry.sendClientTelemetry).toHaveBeenCalledWith("REVEAL_EXAMPLE_OPENED", {
      templateId: "paper-birthday",
      revealType: "collect-messages",
      source: "reveal_modal"
    });
  });

  it("persists an explicit reveal choice and updates the sidebar after success", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    await user.click(screen.getByRole("button", { name: "Изменить" }));
    await user.click(screen.getByRole("radio", { name: "Собрать поздравления — выбрать" }));

    await waitFor(() => expect(actions.updateGiftAnimationAction).toHaveBeenCalledTimes(1));
    const submitted = actions.updateGiftAnimationAction.mock.calls[0][1] as FormData;
    expect(submitted.get("manageToken")).toBe("manage-token");
    expect(submitted.get("giftAnimationId")).toBe("collect-messages");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Выберите способ открытия" })).not.toBeInTheDocument();
    });
    expect(screen.getByText("Собрать поздравления")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Посмотреть пример/ })).toHaveAttribute(
      "href",
      "/example?template=paper-birthday&animation=collect-messages"
    );
    expect(telemetry.sendClientTelemetry).toHaveBeenCalledWith("REVEAL_TYPE_SELECTED", {
      templateId: "paper-birthday",
      revealType: "collect-messages",
      source: "reveal_modal"
    });
  });

  it("keeps the saved reveal and dialog open when persistence fails", async () => {
    actions.updateGiftAnimationAction.mockResolvedValueOnce({ ok: false, message: "Не удалось сохранить." });
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    await user.click(screen.getByRole("button", { name: "Изменить" }));
    await user.click(screen.getByRole("radio", { name: "Собрать поздравления — выбрать" }));

    expect(await screen.findAllByText("Не удалось сохранить.")).toHaveLength(2);
    expect(screen.getByRole("dialog", { name: "Выберите способ открытия" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Конверт — выбрано" })).toHaveAttribute("aria-checked", "true");
    expect(telemetry.sendClientTelemetry).not.toHaveBeenCalledWith(
      "REVEAL_TYPE_SELECTED",
      expect.anything()
    );
  });

  it("keeps template selection in its own dialog", async () => {
    const user = userEvent.setup();
    render(
      <TemplateSummary
        manageToken="manage-token"
        templates={templates}
        initialTemplateId="paper-birthday"
        initialAnimationId="envelope"
      />
    );

    await user.click(screen.getByRole("button", { name: "Выбрать другой шаблон" }));
    expect(screen.getByRole("dialog", { name: "Выберите шаблон" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Выберите способ открытия" })).not.toBeInTheDocument();
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
