import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { OrganizerJourneyStep } from "@/lib/manage/card-design-readiness";
import { DesignRail } from "./design-rail";

const steps: OrganizerJourneyStep[] = [
  { id: "basics", label: "Заполнить основу", description: "Данные открытки", status: "COMPLETED" },
  { id: "design", label: "Выбрать оформление", description: "Шаблон", status: "COMPLETED" },
  { id: "collection", label: "Открыть сбор", description: "Ссылка для участников", status: "CURRENT" },
  { id: "materials", label: "Собрать поздравления и фото", description: "Материалы", status: "UPCOMING" },
  { id: "blocks", label: "Настроить открытку", description: "Состав", status: "UPCOMING" },
  { id: "delivery", label: "Оплатить и передать", description: "Передача", status: "UPCOMING" }
];

describe("DesignRail", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows a compact preparation summary and expands to all stages", async () => {
    const user = userEvent.setup();
    render(
      <DesignRail
        steps={steps}
        completedCount={2}
        lifecycleLabel="Черновик"
        persistenceKey="preparation-test"
        templateCard={<section aria-label="Шаблон">Шаблон</section>}
      />
    );

    expect(screen.getByRole("heading", { name: "Подготовка открытки" })).toBeInTheDocument();
    expect(screen.getByText("Что уже готово и что делать дальше")).toBeInTheDocument();
    expect(screen.queryByText("Путь организатора")).not.toBeInTheDocument();
    expect(screen.getByText("2 из 6 этапов завершено")).toBeInTheDocument();
    expect(screen.getByText("Сейчас")).toBeInTheDocument();
    expect(screen.getByText("Дальше")).toBeInTheDocument();
    const preparation = screen.getByRole("region", { name: "Подготовка открытки" });
    const template = screen.getByRole("region", { name: "Шаблон" });
    expect(
      preparation.compareDocumentPosition(template) & Node.DOCUMENT_POSITION_FOLLOWING
    ).not.toBe(0);

    const toggle = screen.getByRole("button", { name: "Показать все этапы" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Свернуть этапы");
    const fullJourney = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(fullJourney).not.toBeNull();
    expect(within(fullJourney!).getAllByRole("listitem")).toHaveLength(6);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("restores the expanded state during the current browser session", async () => {
    const user = userEvent.setup();
    const renderRail = () =>
      render(
        <DesignRail
          steps={steps}
          completedCount={2}
          lifecycleLabel="Черновик"
          persistenceKey="preparation-session-test"
          templateCard={<section aria-label="Шаблон">Шаблон</section>}
        />
      );

    const firstRender = renderRail();
    await user.click(screen.getByRole("button", { name: "Показать все этапы" }));
    expect(window.sessionStorage.getItem("preparation-session-test")).toBe("expanded");
    firstRender.unmount();

    renderRail();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Свернуть этапы" }))
        .toHaveAttribute("aria-expanded", "true");
    });
  });
});
