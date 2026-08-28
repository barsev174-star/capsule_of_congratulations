import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OrganizerAiHelper } from "./organizer-ai-helper";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const createFetchMock = () => vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
  const body = JSON.parse(init.body as string) as { joinAction: string };
  const callNumber = createFetchMockCallNumber++;
  const family = body.joinAction === "warmer" ? "warm" : body.joinAction === "creative" ? "style" : "short";
  const label = body.joinAction === "warmer" ? "Теплее" : body.joinAction === "creative" ? "Творческий" : "Основной";
  return new Response(JSON.stringify({
    result: {
      variants: [{ id: family, label, text: `${label} вариант ${callNumber}` }],
      generationId: `generation-${callNumber}`,
      usage: { remaining: 5 - callNumber },
      messageLimit: 280
    }
  }), { status: 200, headers: { "Content-Type": "application/json" } });
});

let createFetchMockCallNumber = 1;

describe("OrganizerAiHelper", () => {
  it("показывает исправленную текстовую иконку", () => {
    const { container } = render(
      <OrganizerAiHelper
        cardId="card-1"
        manageToken="manage-1"
        onUseText={vi.fn()}
      />
    );

    expect(container.querySelector("svg")).toHaveAttribute("stroke", "currentColor");
  });

  it("создаёт один MAIN и запускает action только по отдельному CTA", async () => {
    createFetchMockCallNumber = 1;
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <OrganizerAiHelper
        cardId="card-1"
        manageToken="manage-1"
        initialDraft="Спасибо за поддержку и помощь. Желаю радостных дней."
        onUseText={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Подобрать текст" }));
    expect(await screen.findByText("Основной вариант 1")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ваши исходные мысли")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Что хотите сказать?" })).not.toBeInTheDocument();
    expect(screen.queryByText("Готово")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Теплее/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Создать тёплый вариант" }));

    expect(await screen.findByText("Теплее вариант 2")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody).toMatchObject({
      manageToken: "manage-1",
      joinAction: "warmer",
      sourceText: "Основной вариант 1"
    });
  });

  it("сохраняет несколько вариантов family и вставляет выбранный без сохранения", async () => {
    createFetchMockCallNumber = 1;
    const fetchMock = createFetchMock();
    const onUseText = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <OrganizerAiHelper
        cardId="card-1"
        manageToken="manage-1"
        initialDraft="Спасибо за поддержку и помощь. Желаю радостных дней."
        onUseText={onUseText}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Подобрать текст" }));
    await screen.findByText("Основной вариант 1");
    await userEvent.click(screen.getByRole("button", { name: /Другой вариант/ }));
    await userEvent.click(screen.getByRole("button", { name: "Создать другой вариант" }));

    expect(await screen.findByRole("tab", { name: "Основной · 2" })).toBeInTheDocument();
    expect(screen.getByText("2 из 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Предыдущий вариант" }));
    expect(screen.getByText("Основной вариант 1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Вставить в поздравление" }));
    expect(onUseText).toHaveBeenCalledWith("Основной вариант 1", "generation-1");
  });

  it("обновляет текст только после изменения мыслей и сбрасывает устаревшие истории", async () => {
    createFetchMockCallNumber = 1;
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <OrganizerAiHelper
        cardId="card-1"
        manageToken="manage-1"
        initialDraft="Спасибо за поддержку и помощь. Желаю радостных дней."
        onUseText={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "Подобрать текст" }));
    await screen.findByText("Основной вариант 1");
    await userEvent.click(screen.getByRole("button", { name: /Теплее/ }));
    await userEvent.click(screen.getByRole("button", { name: "Создать тёплый вариант" }));
    await screen.findByText("Теплее вариант 2");

    await userEvent.click(screen.getByRole("button", { name: "Изменить" }));
    const draft = screen.getByRole("textbox", { name: "Что хотите сказать?" });
    expect(screen.queryByRole("button", { name: "Обновить по моим мыслям" })).not.toBeInTheDocument();
    await userEvent.type(draft, " Хочу добавить пожелание здоровья.");
    await userEvent.click(screen.getByRole("button", { name: "Обновить по моим мыслям" }));

    expect(await screen.findByText("Основной вариант 3")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Основной" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Теплее/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/из 2/)).not.toBeInTheDocument();
    expect(screen.getByText("Ваши исходные мысли")).toBeInTheDocument();
    const updateBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(updateBody).toMatchObject({
      joinAction: "initial",
      draftNotes: "Спасибо за поддержку и помощь. Желаю радостных дней. Хочу добавить пожелание здоровья."
    });
  });

  it("не удаляет текущий результат при ошибке и позволяет повторить", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: {
          variants: [{ id: "short", label: "Основной", text: "Сохранённый основной текст" }],
          generationId: "generation-1",
          usage: { remaining: 4 },
          messageLimit: 280
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "Временная ошибка" }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        result: {
          variants: [{ id: "warm", label: "Теплее", text: "Тёплый текст после повтора" }],
          generationId: "generation-2",
          usage: { remaining: 3 },
          messageLimit: 280
        }
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <OrganizerAiHelper
        cardId="card-1"
        manageToken="manage-1"
        initialDraft="Спасибо за поддержку и помощь. Желаю радостных дней."
        onUseText={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Подобрать текст" }));
    await screen.findByText("Сохранённый основной текст");
    await userEvent.click(screen.getByRole("button", { name: /Теплее/ }));
    await userEvent.click(screen.getByRole("button", { name: "Создать тёплый вариант" }));

    expect(await screen.findByText(/Текущий текст и история сохранены/)).toBeInTheDocument();
    expect(screen.getByText("Сохранённый основной текст")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.getByText("Тёплый текст после повтора")).toBeInTheDocument());
  });
});
