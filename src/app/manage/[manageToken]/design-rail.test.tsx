import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
  it("shows a compact preparation summary and expands to all stages", async () => {
    const user = userEvent.setup();
    render(
      <DesignRail
        steps={steps}
        completedCount={2}
        lifecycleLabel="Черновик"
        giftAccessible={false}
        templateCard={<section aria-label="Шаблон">Шаблон</section>}
      />
    );

    expect(screen.getByRole("heading", { name: "Подготовка открытки" })).toBeInTheDocument();
    expect(screen.getByText("Что уже готово и что делать дальше")).toBeInTheDocument();
    expect(screen.queryByText("Путь организатора")).not.toBeInTheDocument();
    expect(screen.getByText("2 из 6 этапов завершено")).toBeInTheDocument();
    expect(screen.getByText("Сейчас")).toBeInTheDocument();
    expect(screen.getByText("Дальше")).toBeInTheDocument();
    expect(screen.getByText(/Ещё 2 этапа/)).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Показать все этапы" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Свернуть этапы");
    const fullJourney = document.getElementById("card-preparation-details");
    expect(fullJourney).not.toBeNull();
    expect(within(fullJourney!).getAllByRole("listitem")).toHaveLength(6);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
