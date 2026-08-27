import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipantForm } from "./participant-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const props = {
  cardId: "card-1",
  publicSlug: "birthday-card",
  recipientName: "Наталья",
  occasionText: "С днём рождения!",
  messageLimit: 280,
  variant: "join" as const
};

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ParticipantForm — одновариантный AI flow", () => {
  it("не обрезает черновик длиннее 700 символов и не отправляет AI-запрос", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ParticipantForm {...props} />);

    const messageField = screen.getByLabelText("Текст поздравления");
    expect(messageField).toHaveAttribute("maxlength", "700");
    fireEvent.change(messageField, { target: { value: "а".repeat(701) } });
    await userEvent.click(screen.getByRole("button", { name: "Помочь с текстом" }));

    expect(await screen.findByText(/AI-помощник принимает до 700 символов/u)).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/generate-greeting")).toHaveLength(0);
  });

  it("раскрывает действие без списания и отправляет запрос только по отдельному CTA", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/gift-poll")) return Promise.resolve({ ok: false, json: async () => ({}) });
      const generationIndex = fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === "/api/ai/generate-greeting").length;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          result: {
            variants: [{ id: generationIndex === 1 ? "short" : "warm", label: generationIndex === 1 ? "Готовый текст" : "Теплее", text: generationIndex === 1 ? "Спасибо за поддержку. Желаю радостных дней." : "Спасибо тебе за такую важную поддержку. Желаю радостных дней." }],
            generationId: `generation-${generationIndex}`,
            usage: { remaining: 3 - generationIndex },
            messageLimit: 280
          }
        })
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ParticipantForm {...props} />);

    fireEvent.change(screen.getByLabelText("Текст поздравления"), { target: { value: "Спасибо за поддержку и помощь. Желаю радостных дней." } });
    await userEvent.click(screen.getByRole("button", { name: "Помочь с текстом" }));
    expect(await screen.findByText("Спасибо за поддержку. Желаю радостных дней.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Теплее/ }));
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/generate-greeting")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Создать тёплый вариант" }));

    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/generate-greeting")).toHaveLength(2));
    const secondRequest = JSON.parse(fetchMock.mock.calls.filter(([url]) => url === "/api/ai/generate-greeting")[1][1].body as string);
    expect(secondRequest).toMatchObject({
      joinAction: "warmer",
      sourceText: "Спасибо за поддержку. Желаю радостных дней."
    });
    expect(await screen.findByRole("tab", { name: "Теплее" })).toBeInTheDocument();
  });

  it("создаёт новые основные версии с накопленными деталями и сохраняет историю", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/gift-poll")) return Promise.resolve({ ok: false, json: async () => ({}) });
      const generationIndex = fetchMock.mock.calls.filter(([calledUrl]) => calledUrl === "/api/ai/generate-greeting").length;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          result: {
            variants: [{ id: "short", label: "Готовый текст", text: `Основной вариант ${generationIndex}` }],
            generationId: `generation-${generationIndex}`,
            usage: { remaining: 4 - generationIndex },
            messageLimit: 280
          }
        })
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ParticipantForm {...props} />);

    fireEvent.change(screen.getByLabelText("Текст поздравления"), {
      target: { value: "Спасибо за поддержку и помощь. Желаю радостных дней." }
    });
    await userEvent.click(screen.getByRole("button", { name: "Помочь с текстом" }));
    expect(await screen.findByText("Основной вариант 1")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    await userEvent.type(screen.getByLabelText("Что ещё важно упомянуть?"), "Он помог мне с переездом");
    await userEvent.click(screen.getByRole("button", { name: "Создать вариант с деталями" }));
    expect(await screen.findByRole("tab", { name: "Основной · 2" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    await userEvent.type(screen.getByLabelText("Что ещё важно упомянуть?"), "Дружим со школы");
    await userEvent.click(screen.getByRole("button", { name: "Создать вариант с деталями" }));
    expect(await screen.findByRole("tab", { name: "Основной · 3" })).toBeInTheDocument();

    const aiRequests = fetchMock.mock.calls.filter(([url]) => url === "/api/ai/generate-greeting");
    const secondBody = JSON.parse(aiRequests[1][1].body as string);
    const thirdBody = JSON.parse(aiRequests[2][1].body as string);
    expect(secondBody).toMatchObject({
      joinAction: "initial",
      requiredDetail: "Он помог мне с переездом"
    });
    expect(secondBody.sourceText).toBeUndefined();
    expect(thirdBody.requiredDetail).toBe("Он помог мне с переездом. Дружим со школы");
    expect(screen.getByText("3 из 3")).toBeInTheDocument();
  });
});
