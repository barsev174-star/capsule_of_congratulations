import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Contribution } from "@/lib/cards/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  deleteContributionAction: vi.fn(),
  saveOrganizerContributionAction: vi.fn()
}));
vi.mock("./use-modal-focus", () => ({ useModalFocus: vi.fn() }));
vi.mock("@/app/card/[publicSlug]/ai-helper", () => ({
  AiHelper: ({
    sourceContributionId,
    sourceText,
    onUseText
  }: {
    sourceContributionId?: string;
    sourceText?: string;
    onUseText: (text: string, generationId: string) => void;
  }) => (
    <div>
      <span>{sourceContributionId}</span>
      <p>{sourceText}</p>
      <button type="button" onClick={() => onUseText("Новый AI-вариант поздравления с тёплыми словами.", "generation-1")}>Выбрать AI-вариант</button>
    </div>
  )
}));

import { ContributionEditor } from "./contribution-editor";

const contribution: Contribution = {
  id: "contribution-1",
  cardId: "card-1",
  authorName: "Мария",
  authorRole: "коллега",
  authorAvatarUrl: null,
  message: "Исходное поздравление, которое нужно бережно улучшить.",
  sortOrder: 0,
  status: "visible",
  source: "participant",
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z"
};

describe("ContributionEditor AI editing", () => {
  it("передаёт AI текущее поздравление и позволяет вернуть исходник", async () => {
    render(
      <ContributionEditor
        cardId="card-1"
        manageToken="manage-1"
        occasionText="С днём рождения!"
        contribution={contribution}
        isMainGreeting={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("tab", { name: /помочь с текстом/i }));
    expect(screen.getByText("contribution-1")).toBeInTheDocument();
    expect(screen.getByText(contribution.message)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Выбрать AI-вариант" }));
    expect(screen.getByRole("textbox", { name: "Текст поздравления" })).toHaveValue("Новый AI-вариант поздравления с тёплыми словами.");
    expect(screen.getByRole("status")).toHaveTextContent("AI-вариант подставлен");

    await userEvent.click(screen.getByRole("button", { name: "Вернуть исходный текст" }));
    expect(screen.getByRole("textbox", { name: "Текст поздравления" })).toHaveValue(contribution.message);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("ContributionEditor form states", () => {
  const renderEditor = (item: Contribution, isMainGreeting = false) => render(
    <ContributionEditor
      cardId="card-1"
      manageToken="manage-1"
      occasionText="С днём рождения!"
      contribution={item}
      isMainGreeting={isMainGreeting}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      onDeleted={vi.fn()}
    />
  );

  it("distinguishes enabled on, enabled off and locked switch states", () => {
    const view = renderEditor(contribution);
    const visibleSwitch = screen.getByRole("switch", { name: /Показывать в открытке/i });
    const mainSwitch = screen.getByRole("switch", { name: /Главное поздравление/i });
    expect(visibleSwitch).toBeEnabled();
    expect(visibleSwitch).toHaveAttribute("aria-checked", "true");
    expect(mainSwitch).toBeEnabled();
    expect(mainSwitch).toHaveAttribute("aria-checked", "false");

    view.unmount();
    renderEditor({ ...contribution, status: "hidden" });
    expect(screen.getByRole("switch", { name: /Показывать в открытке/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: /Главное поздравление/i })).toBeDisabled();
    expect(screen.getByText("Сначала включите показ поздравления в открытке.")).toBeInTheDocument();
  });

  it("labels both switches as locked for the current main greeting", () => {
    renderEditor(contribution, true);
    expect(screen.getByRole("switch", { name: /Показывать в открытке/i })).toBeDisabled();
    expect(screen.getByRole("switch", { name: /Главное поздравление/i })).toBeDisabled();
    expect(screen.getAllByText("Заблокировано")).toHaveLength(2);
    expect(screen.getByText("Сначала выберите другое главное поздравление.")).toBeInTheDocument();
  });

  it("keeps reserved error rows mounted before and after validation", async () => {
    const user = userEvent.setup();
    renderEditor(contribution);
    const errorSlot = document.getElementById("contribution-author-role-error");
    expect(errorSlot).toBeInTheDocument();
    expect(errorSlot).toHaveAttribute("aria-hidden", "true");

    const roleInput = screen.getByRole("textbox", { name: "Роль или подпись" });
    await user.clear(roleInput);
    expect(document.getElementById("contribution-author-role-error")).toBe(errorSlot);
    expect(errorSlot).toHaveTextContent("Укажите роль или подпись.");
    expect(errorSlot).not.toHaveAttribute("aria-hidden");
  });
});
