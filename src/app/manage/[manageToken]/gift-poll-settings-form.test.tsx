import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GiftPollSettingsForm } from "./gift-poll-settings-form";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";

const { refresh, enableGiftPollAction } = vi.hoisted(() => ({
  refresh: vi.fn(),
  enableGiftPollAction: vi.fn(async (_previous: unknown, _formData: FormData) => ({
    ok: true,
    message: "Голосование включено. Добавьте варианты подарка или бюджета."
  }))
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

vi.mock("./actions", () => ({
  closeGiftPollAction: vi.fn(),
  enableGiftPollAction,
  openGiftPollAction: vi.fn(),
  reopenGiftPollAction: vi.fn(),
  saveGiftPollAction: vi.fn(async () => ({ ok: true, message: "Сохранено" })),
  saveGiftPollSettingsAction: vi.fn(async () => ({ ok: true, message: "Сохранено" })),
  reorderGiftPollOptionsAction: vi.fn(async () => ({ ok: true, message: "Порядок сохранён" })),
  selectGiftPollOptionAction: vi.fn()
}));

const activePoll: GiftPollWithOptions = {
  id: "poll-id",
  cardId: "card-id",
  mode: "gift",
  title: "Выберите подарок",
  question: "Что подарить?",
  status: "open",
  closesAt: null,
  closedAt: null,
  selectedOptionId: null,
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  totalVotes: 0,
  votesByOptionId: {},
  options: ["Первый вариант", "Второй вариант"].map((title, index) => ({
    id: `option-${index + 1}`,
    pollId: "poll-id",
    title,
    description: `Описание ${index + 1}`,
    imageUrl: null,
    priceLabel: `${1000 + index * 500}`,
    productUrl: null,
    sortOrder: index,
    deletedAt: null,
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z"
  }))
};

const renderInactivePoll = () => render(
  <main>
    <GiftPollSettingsForm
      manageToken="manage-token"
      recipientName="Наталья Афанасьевна"
      publicSlug="public-slug"
      poll={null}
      eligibleVoterCount={7}
      collectionIsOpen
    />
  </main>
);

const setMobileMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })
  });
};

describe("GiftPollSettingsForm inactive onboarding", () => {
  beforeEach(() => {
    refresh.mockReset();
    enableGiftPollAction.mockClear();
    document.body.style.overflow = "";
    setMobileMedia(true);
  });

  it("explains the complete voting sequence before activation", () => {
    renderInactivePoll();

    expect(screen.getByRole("heading", { name: "Выбор подарка" })).toBeInTheDocument();
    expect(screen.getByText("Голосование не включено")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Включите голосование" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Добавьте варианты" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Участники проголосуют после отправки" })).toBeInTheDocument();
    const enableButton = screen.getByRole("button", { name: "Включить голосование" });
    expect(enableButton).toBeEnabled();
    expect(enableButton.querySelector("span")).toBeNull();
    expect(screen.getByRole("button", { name: "Как это работает" })).toBeEnabled();
  });

  it("expands future capabilities from one accessible trigger", async () => {
    const user = userEvent.setup();
    renderInactivePoll();
    const trigger = screen.getByRole("button", { name: "Что станет доступно" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("gift-poll-benefits-content")).toHaveAttribute("aria-hidden", "true");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("gift-poll-benefits-content")).toHaveAttribute("aria-hidden", "false");
    expect(screen.getByText("Несколько сумм для выбора общего ориентира.")).toBeInTheDocument();
  });

  it("shows future capabilities expanded by default on desktop", async () => {
    setMobileMedia(false);
    renderInactivePoll();

    const trigger = screen.getByRole("button", { name: "Что станет доступно" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByText("Варианты подарка, ориентиры бюджета и приватные результаты.")).toBeInTheDocument();
  });

  it("opens an accessible explanation dialog and returns focus on Escape", async () => {
    const user = userEvent.setup();
    renderInactivePoll();
    const trigger = screen.getByRole("button", { name: "Как это работает" });

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Как работает голосование" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the explanation dialog on browser back navigation", async () => {
    const user = userEvent.setup();
    renderInactivePoll();
    const trigger = screen.getByRole("button", { name: "Как это работает" });

    await user.click(trigger);
    window.dispatchEvent(new PopStateEvent("popstate"));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("submits the real activation action and refreshes server data", async () => {
    const user = userEvent.setup();
    renderInactivePoll();

    await user.click(screen.getByRole("button", { name: "Включить голосование" }));

    await waitFor(() => expect(enableGiftPollAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

describe("GiftPollSettingsForm active poll", () => {
  beforeEach(() => {
    refresh.mockReset();
    setMobileMedia(false);
  });

  it("shows access and votes as separate server counters", () => {
    render(<GiftPollSettingsForm manageToken="manage-token" recipientName="Наталья" publicSlug="public-slug" poll={activePoll} eligibleVoterCount={7} collectionIsOpen />);
    expect(screen.getByText("Доступ: 7")).toBeInTheDocument();
    expect(screen.getByText("Голосов: 0")).toBeInTheDocument();
    expect(screen.queryByText("0 из 7")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Кто может голосовать" })).toHaveAttribute("title", expect.stringContaining("Поздравления, добавленные организатором, не учитываются"));
  });

  it("opens a dedicated order editor without reorder controls in the regular list", async () => {
    const user = userEvent.setup();
    render(<GiftPollSettingsForm manageToken="manage-token" recipientName="Наталья" publicSlug="public-slug" poll={activePoll} eligibleVoterCount={7} collectionIsOpen />);
    expect(screen.queryByLabelText(/Перетащите, чтобы изменить порядок/)).not.toBeInTheDocument();
    expect(screen.queryByText("Переместить выше")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Изменить порядок" }));
    expect(screen.getByRole("dialog", { name: "Порядок вариантов" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить порядок" })).toBeDisabled();
  });

  it("asks for confirmation before switching a populated scenario", async () => {
    const user = userEvent.setup();
    render(<GiftPollSettingsForm manageToken="manage-token" recipientName="Наталья" publicSlug="public-slug" poll={activePoll} eligibleVoterCount={7} collectionIsOpen />);
    await user.click(screen.getByRole("button", { name: "Изменить настройки голосования" }));
    await user.click(screen.getByRole("radio", { name: "БюджетПодходящий уровень общей суммы" }));
    expect(screen.getByRole("alertdialog", { name: "Сменить сценарий голосования?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ПодарокОдин из конкретных вариантов" })).toBeChecked();
  });
});
