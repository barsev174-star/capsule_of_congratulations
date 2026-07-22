import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftPollVote } from "./gift-poll-vote";
import { JoinSidePanel } from "./join-side-panel";

const slug = "test-slug";
const storageKey = `participant-submission-${slug}`;

const poll = {
  mode: "gift" as const,
  title: "Выбор подарка",
  question: "Что дарим?",
  options: [
    { id: "o1", title: "книга", description: null, imageUrl: null, priceLabel: null, productUrl: "https://example.com/book" },
    { id: "o2", title: "сертификат", description: null, imageUrl: null, priceLabel: null, productUrl: null }
  ],
  selectedOptionId: null as string | null
};

const panelProps = {
  variants: [],
  generationId: "",
  isPending: false,
  limitReached: false,
  issues: [],
  remaining: null,
  activeHintId: null,
  activeHintExample: null,
  hintExampleVisible: false,
  exampleBlockId: "hint-example",
  onHintSelect: vi.fn(),
  onHideHintExample: vi.fn(),
  onUseVariant: vi.fn(),
  onRetry: vi.fn()
};

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("JoinSidePanel — приоритет состояний", () => {
  it("без опроса показывает подсказки без тизера", () => {
    render(<JoinSidePanel {...panelProps} state="idle" hasActivePoll={false} />);

    expect(screen.getByText("О чём можно написать")).toBeInTheDocument();
    expect(screen.queryByText(/помочь выбрать подарок/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /перейти к голосованию/i })).not.toBeInTheDocument();
  });

  it("с опросом подсказки остаются, появляется только неинтерактивный тизер", () => {
    render(<JoinSidePanel {...panelProps} state="idle" hasActivePoll={true} />);

    expect(screen.getByText("О чём можно написать")).toBeInTheDocument();
    expect(screen.getByText(/после поздравления можно помочь выбрать подарок/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /перейти к голосованию/i })).not.toBeInTheDocument();
  });

  it("ИИ loading не вытесняется опросом", () => {
    render(<JoinSidePanel {...panelProps} state="loading" hasActivePoll={true} />);

    expect(screen.getByText("Готовим три варианта")).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });

  it("ИИ results не вытесняется опросом", () => {
    const variants = [
      { id: "short" as const, label: "Аккуратно", text: "Вариант один" },
      { id: "warm" as const, label: "Теплее", text: "Вариант два" },
      { id: "style" as const, label: "Живее", text: "Вариант три" }
    ];
    render(<JoinSidePanel {...panelProps} state="variants" variants={variants} hasActivePoll={true} />);

    expect(screen.getByText("Выберите вариант")).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });

  it("ИИ error не вытесняется опросом", () => {
    render(<JoinSidePanel {...panelProps} state="error" issues={["Ошибка генерации"]} hasActivePoll={true} />);

    expect(screen.getByText("Не получилось подготовить варианты")).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });
});

describe("GiftPollVote — post-submit сценарий", () => {
  it("до отправки поздравления ничего не показывает", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ teaser: poll }) }));
    const { container } = render(<GiftPollVote publicSlug={slug} active={false} inviteToReveal />);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("после отправки с опросом показывает приглашение, а не форму голосования", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal />);

    const button = await screen.findByRole("button", { name: /перейти к голосованию/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByText("Поздравление добавлено")).toHaveLength(1);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("по нажатию раскрывает полноширинную inline-секцию голосования", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal />);

    const button = await screen.findByRole("button", { name: /перейти к голосованию/i });
    await userEvent.click(button);

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByText(/помогите выбрать подарок/i)).toBeInTheDocument();
    expect(screen.getAllByText("Какой вариант лучше выбрать для подарка?")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Отдать голос" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("выбирает карточку отдельно от товарной ссылки", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active />);

    const option = await screen.findByRole("radio", { name: /книга/i });
    await userEvent.click(screen.getByRole("link", { name: /открыть вариант «книга»/i }));
    expect(option).toHaveAttribute("aria-checked", "false");

    await userEvent.click(option);
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Отдать голос" })).toBeEnabled();
  });

  it("при ошибке сохраняет выбор и предлагает повторить", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ poll }) })
      .mockResolvedValueOnce({ ok: false }));
    render(<GiftPollVote publicSlug={slug} active />);

    await userEvent.click(await screen.findByRole("radio", { name: /книга/i }));
    await userEvent.click(screen.getByRole("button", { name: "Отдать голос" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ваш выбор сохранён/i);
    expect(screen.getByRole("radio", { name: /книга/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Повторить" })).toBeEnabled();
  });

  it("уже проголосовавшему показывает «Голос учтён»", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: { ...poll, selectedOptionId: "o1" } }) })
    );
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal />);

    expect(await screen.findByText("Спасибо, ваш голос учтён")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Изменить выбор" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /перейти к голосованию/i })).not.toBeInTheDocument();
  });

  it("без inviteToReveal сохраняет прежнее поведение: форма голосования сразу", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active={true} />);

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
  });

  it("ошибка загрузки опроса не ломает страницу", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const { container } = render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal />);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
