import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contribution } from "@/lib/cards/types";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), select: vi.fn(), save: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("./actions", () => ({ setMainGreetingAction: mocks.select, saveOrganizerContributionAction: mocks.save, deleteContributionAction: vi.fn() }));
vi.mock("./contribution-order-editor", () => ({ ContributionOrderEditor: () => null }));
vi.mock("@/app/card/[publicSlug]/ai-helper", () => ({ AiHelper: () => null }));
vi.mock("./organizer-ai-helper", () => ({ OrganizerAiHelper: () => null }));

import { CongratulationsPanel } from "./congratulations-panel";

const greeting = (id: string, authorName: string, overrides: Partial<Contribution> = {}): Contribution => ({
  id, authorName, cardId: "card-1", authorRole: "коллега", authorAvatarUrl: null,
  message: `Дорогой друг, ${authorName} желает тебе радости и прекрасных событий!`,
  sortOrder: 0, status: "visible", source: "manual", createdAt: "2026-11-12T00:00:00.000Z", updatedAt: "2026-11-12T00:00:00.000Z",
  ...overrides
});
const first = greeting("first", "Мария");
const second = greeting("second", "Олег");
const hidden = greeting("hidden", "Скрытый автор", { status: "hidden" });
const props = {
  cardId: "card-1", manageToken: "manage-1", occasionText: "С праздником!", participantLink: "https://example.com/join/test",
  lifecycle: { collectionStatus: "OPEN" as const }, mainGreetingContributionId: null as string | null
};
const panel = (items: Contribution[], mainId: string | null = null) => <CongratulationsPanel {...props} allContributions={items} mainGreetingContributionId={mainId} />;
const picker = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockResolvedValue({ ok: true, message: "Главное поздравление выбрано." });
  mocks.save.mockResolvedValue({ ok: true, contributionId: "new", message: "Сохранено" });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("main greeting flow", () => {
  it("lets the user choose an active greeting without editing its text", async () => {
    const user = userEvent.setup();
    const view = render(panel([first, second, hidden]));
    await user.click(screen.getByRole("button", { name: "Выбрать главное", exact: true }));
    expect(picker().getAllByRole("radio")).toHaveLength(2);
    expect(picker().queryByText(hidden.authorName)).not.toBeInTheDocument();
    expect(picker().getByRole("button", { name: "Сделать главным", exact: true })).toBeDisabled();
    await user.click(picker().getByRole("radio", { name: /Олег/ }));
    await user.click(picker().getByRole("button", { name: "Сделать главным", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const form = mocks.select.mock.calls[0][0] as FormData;
    expect(form.get("contributionId")).toBe(second.id);
    expect(form.get("manageToken")).toBe(props.manageToken);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    view.rerender(panel([first, second, hidden], second.id));
    expect(within(document.getElementById(`contribution-${second.id}`)!).getByText(second.authorName)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Развернуть поздравление Олег/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Развернуть поздравление Мария/ })).toBeInTheDocument();
  });

  it("replaces the main greeting and returns the previous one to the ordinary list", async () => {
    const user = userEvent.setup();
    const view = render(panel([first, second], first.id));
    await user.click(screen.getByRole("button", { name: "Заменить", exact: true }));
    expect(picker().getByRole("radio", { name: /Мария/ })).toBeChecked();
    expect(picker().getByRole("button", { name: "Сделать главным", exact: true })).toBeDisabled();
    await user.click(picker().getByRole("radio", { name: /Олег/ }));
    await user.click(picker().getByRole("button", { name: "Сделать главным", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    view.rerender(panel([first, second], second.id));
    expect(screen.getByRole("button", { name: /Развернуть поздравление Мария/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Развернуть поздравление Олег/ })).not.toBeInTheDocument();
    expect((mocks.select.mock.calls[0][0] as FormData).get("contributionId")).toBe(second.id);
  });

  it("closes with Escape without changing the current main greeting", async () => {
    const user = userEvent.setup();
    render(panel([first, second], first.id));
    const replace = screen.getByRole("button", { name: "Заменить", exact: true });
    await user.click(replace);
    await user.click(picker().getByRole("radio", { name: /Олег/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.select).not.toHaveBeenCalled();
    expect(replace).toHaveFocus();
  });

  it.each([{ items: [] }, { items: [hidden] }])("creates and assigns the main greeting when no active greetings exist (%#)", async ({ items }) => {
    const user = userEvent.setup();
    render(panel(items));
    await user.click(screen.getByRole("button", { name: "Создать главное поздравление", exact: true }));
    expect(picker().getByRole("heading", { name: "Создать главное поздравление" })).toBeInTheDocument();
    expect(picker().getByRole("textbox", { name: "Текст поздравления" })).toHaveAttribute("maxlength", "700");
    await user.type(picker().getByRole("textbox", { name: "Имя автора" }), "Анна");
    await user.type(picker().getByRole("textbox", { name: "Текст поздравления" }), first.message);
    await user.click(picker().getByRole("button", { name: "Создать главное поздравление", exact: true }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    const form = mocks.save.mock.calls[0][1] as FormData;
    expect(form.get("isMainGreeting")).toBe("true");
    expect(form.get("status")).toBe("visible");
    expect(form.get("contributionId")).toBe("");
    expect(screen.getByRole("status")).toHaveTextContent("Главное поздравление выбрано");
  });

  it("keeps ordinary creation ordinary when a main greeting has not been selected", async () => {
    const user = userEvent.setup();
    render(panel([first]));
    await user.click(screen.getByRole("button", { name: /Добавить поздравление/ }));
    expect(picker().getByRole("textbox", { name: "Текст поздравления" })).toHaveAttribute("maxlength", "1500");
    await user.type(picker().getByRole("textbox", { name: "Имя автора" }), "Анна");
    await user.type(picker().getByRole("textbox", { name: "Текст поздравления" }), first.message);
    await user.click(picker().getByRole("button", { name: "Добавить поздравление", exact: true }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect((mocks.save.mock.calls[0][1] as FormData).get("isMainGreeting")).toBe("false");
  });

  it("requires a long greeting to be shortened before assigning it as main", async () => {
    const user = userEvent.setup();
    const long = greeting("long", "Длинный автор", { message: "Я".repeat(701) });
    render(panel([long]));
    await user.click(screen.getByRole("button", { name: "Выбрать главное", exact: true }));
    await user.click(picker().getByRole("radio", { name: /Длинный автор/ }));
    await user.click(picker().getByRole("button", { name: "Сократить и сделать главным" }));
    expect(picker().getByRole("heading", { name: "Сделать поздравление главным" })).toBeInTheDocument();
    expect(mocks.select).not.toHaveBeenCalled();
    await user.click(picker().getByRole("button", { name: "Сохранить и сделать главным" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(picker().getByRole("alert")).toHaveTextContent("Сократите главное поздравление до 700 символов.");
    fireEvent.change(picker().getByRole("textbox", { name: "Текст поздравления" }), { target: { value: first.message } });
    await user.click(picker().getByRole("button", { name: "Сохранить и сделать главным" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    const form = mocks.save.mock.calls[0][1] as FormData;
    expect(form.get("contributionId")).toBe(long.id);
    expect(form.get("isMainGreeting")).toBe("true");
    expect(form.get("message")).toBe(first.message);
  });

  it("allows a new main greeting to replace the only existing one", async () => {
    const user = userEvent.setup();
    render(panel([first], first.id));
    await user.click(screen.getByRole("button", { name: "Заменить", exact: true }));
    await user.click(picker().getByRole("button", { name: "Создать главное поздравление" }));
    expect(picker().getByRole("heading", { name: "Создать главное поздравление" })).toBeInTheDocument();
    await user.type(picker().getByRole("textbox", { name: "Имя автора" }), "Анна");
    await user.type(picker().getByRole("textbox", { name: "Текст поздравления" }), second.message);
    await user.click(picker().getByRole("button", { name: "Создать главное поздравление", exact: true }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect((mocks.save.mock.calls[0][1] as FormData).get("isMainGreeting")).toBe("true");
  });

  it("searches active greetings independently of the main list filters", async () => {
    const user = userEvent.setup();
    render(panel([first, second, hidden]));
    await user.type(screen.getByRole("searchbox", { name: "Поиск поздравлений" }), "Мария");
    await user.click(screen.getByRole("button", { name: "Выбрать главное", exact: true }));
    expect(picker().getAllByRole("radio")).toHaveLength(2);
    await user.type(picker().getByRole("searchbox"), "олег");
    expect(picker().getAllByRole("radio")).toHaveLength(1);
    expect(picker().getByRole("radio", { name: /Олег/ })).toBeInTheDocument();
  });

  it("keeps the picker open on failure and allows retry", async () => {
    mocks.select.mockResolvedValueOnce({ ok: false, message: "Поздравление больше не доступно" });
    const user = userEvent.setup();
    render(panel([first]));
    await user.click(screen.getByRole("button", { name: "Выбрать главное", exact: true }));
    await user.click(picker().getByRole("radio", { name: /Мария/ }));
    await user.click(picker().getByRole("button", { name: "Сделать главным", exact: true }));
    expect(await picker().findByRole("alert")).toHaveTextContent("Поздравление больше не доступно");
    expect(mocks.refresh).not.toHaveBeenCalled();
    await user.click(picker().getByRole("button", { name: "Сделать главным", exact: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });

  it("blocks duplicate submissions and closing until selection finishes", async () => {
    let complete!: (result: { ok: boolean; message: string }) => void;
    mocks.select.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; }));
    const user = userEvent.setup();
    render(panel([first]));
    await user.click(screen.getByRole("button", { name: "Выбрать главное", exact: true }));
    await user.click(picker().getByRole("radio", { name: /Мария/ }));
    await user.click(picker().getByRole("button", { name: "Сделать главным", exact: true }));
    expect(picker().getByRole("button", { name: "Сохраняем…" })).toBeDisabled();
    expect(picker().getByRole("button", { name: /Закрыть выбор/ })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => complete({ ok: true, message: "Сохранено" }));
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
