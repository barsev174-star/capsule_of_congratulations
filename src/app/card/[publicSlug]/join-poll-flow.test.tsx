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

const pollWithFiveOptions = {
  ...poll,
  options: [
    ...poll.options,
    { id: "o3", title: "цветы", description: null, imageUrl: null, priceLabel: null, productUrl: null },
    { id: "o4", title: "театр", description: null, imageUrl: null, priceLabel: null, productUrl: null },
    { id: "o5", title: "ужин", description: null, imageUrl: null, priceLabel: null, productUrl: null }
  ]
};

const budgetPoll = {
  ...poll,
  mode: "budget" as const,
  title: "Выберем общий бюджет",
  question: "Какую сумму заложить на подарок?",
  options: [
    { id: "b1", title: "3 000 ₽", description: "Небольшой общий подарок", imageUrl: null, priceLabel: null, productUrl: null },
    { id: "b2", title: "5 000 ₽", description: null, imageUrl: null, priceLabel: null, productUrl: null }
  ]
};

const panelProps = {
  result: null,
  family: "main" as const,
  availableFamilies: ["main" as const],
  familyCounts: { main: 1, warm: 0, creative: 0 },
  historyIndex: 0,
  historyCount: 1,
  generationId: "",
  isPending: false,
  pendingOperation: null,
  limitReached: false,
  issues: [],
  canRetry: false,
  remaining: null,
  messageLimit: 280,
  activeHintId: null,
  activeHintExample: null,
  hintExampleVisible: false,
  exampleBlockId: "hint-example",
  onHintSelect: vi.fn(),
  onHideHintExample: vi.fn(),
  onUseResult: vi.fn(),
  onFamilySelect: vi.fn(),
  onRequest: vi.fn(),
  onAddDetail: vi.fn(),
  onPrevious: vi.fn(),
  onNext: vi.fn(),
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

    expect(screen.getByText("Готовим текст")).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });

  it("ИИ results не вытесняется опросом", () => {
    const result = { id: "short" as const, label: "Готовый текст", text: "Вариант один" };
    render(<JoinSidePanel {...panelProps} state="result" result={result} hasActivePoll={true} />);

    expect(screen.getByText("Готовый текст")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Основной" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Теплее" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Творческий/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Другой вариант/ })).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });

  it("при преобразовании сохраняет готовый текст и показывает выбранное действие", () => {
    const result = { id: "short" as const, label: "Готовый текст", text: "Вариант один" };
    render(<JoinSidePanel {...panelProps} state="result" result={result} isPending pendingOperation="creative" />);

    expect(screen.getByText("Вариант один")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Создаём творческий вариант");
    expect(screen.getByRole("button", { name: /Творческий/ })).toBeDisabled();
  });

  it("при ошибке преобразования не скрывает прежний результат", () => {
    const result = { id: "short" as const, label: "Готовый текст", text: "Вариант один" };
    render(<JoinSidePanel {...panelProps} state="result" result={result} issues={["Проверьте соединение."]} />);

    expect(screen.getByText("Вариант один")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Текущий текст сохранён");
  });

  it("держит открытым только один accordion-пункт и принимает новую деталь", async () => {
    const onRequest = vi.fn();
    const onAddDetail = vi.fn();
    const result = { id: "short" as const, label: "Готовый текст", text: "Спасибо за поддержку. Желаю здоровья и радостных дней." };
    render(<JoinSidePanel {...panelProps} state="result" result={result} onRequest={onRequest} onAddDetail={onAddDetail} />);

    await userEvent.click(screen.getByRole("button", { name: /Творческий/ }));
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByText(/Подача станет свободнее и образнее/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    expect(screen.queryByText(/Подача станет свободнее и образнее/)).not.toBeInTheDocument();
    expect(screen.getByText(/отдельном основном варианте.*версии сохранятся/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать вариант с деталями" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    expect(screen.queryByLabelText("Что ещё важно упомянуть?")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Творческий/ }));
    await userEvent.click(screen.getByRole("button", { name: "Создать творческий вариант" }));
    expect(onRequest).toHaveBeenCalledWith("creative");

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    await userEvent.type(screen.getByLabelText("Что ещё важно упомянуть?"), "Он помог мне с переездом");
    expect(screen.getByText("24 / 300")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Создать вариант с деталями" }));
    expect(onAddDetail).toHaveBeenCalledWith("Он помог мне с переездом");
    expect(screen.queryByLabelText("Что ещё важно упомянуть?")).not.toBeInTheDocument();
  });

  it("считает Unicode-символы и не активирует детали из одних пробелов", async () => {
    const result = { id: "short" as const, label: "Готовый текст", text: "Спасибо за поддержку. Желаю здоровья и радостных дней." };
    render(<JoinSidePanel {...panelProps} state="result" result={result} />);

    await userEvent.click(screen.getByRole("button", { name: /Добавить свои детали/ }));
    const detailField = screen.getByLabelText("Что ещё важно упомянуть?");
    const createButton = screen.getByRole("button", { name: "Создать вариант с деталями" });
    await userEvent.type(detailField, "   ");
    expect(createButton).toBeDisabled();
    await userEvent.type(detailField, "🙂");
    expect(screen.getByText("4 / 300")).toBeInTheDocument();
    expect(createButton).toBeEnabled();
  });

  it("показывает сокращение только для достаточно длинного результата", () => {
    const shortResult = { id: "short" as const, label: "Готовый текст", text: "Спасибо за поддержку. Желаю здоровья." };
    const { rerender } = render(<JoinSidePanel {...panelProps} state="result" result={shortResult} />);
    expect(screen.queryByRole("button", { name: /Сделать короче/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Раскрыть подробнее/ })).toBeInTheDocument();

    const longResult = { ...shortResult, text: "Спасибо за поддержку и помощь в самых разных ситуациях. ".repeat(5) };
    rerender(<JoinSidePanel {...panelProps} state="result" result={longResult} />);
    expect(screen.getByRole("button", { name: /Сделать короче/ })).toBeInTheDocument();
  });

  it("перелистывает историю только внутри выбранного режима", async () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const result = { id: "warm" as const, label: "Теплее", text: "Тёплый вариант два" };
    render(
      <JoinSidePanel
        {...panelProps}
        state="result"
        result={result}
        family="warm"
        availableFamilies={["main", "warm"]}
        familyCounts={{ main: 1, warm: 2, creative: 0 }}
        historyIndex={1}
        historyCount={2}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    );

    expect(screen.getByText("2 из 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Предыдущий вариант" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Следующий вариант" })).toBeDisabled();
  });

  it("явно объясняет отключённые действия после окончания попыток", async () => {
    const result = { id: "short" as const, label: "Готовый текст", text: "Спасибо за поддержку. Желаю здоровья." };
    render(<JoinSidePanel {...panelProps} state="result" result={result} remaining={0} limitReached />);

    expect(screen.getByText(/AI-попытки закончились.*созданные варианты/iu)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Другой вариант/ }));
    expect(screen.getByRole("button", { name: "Создать другой вариант" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Основной" })).toBeEnabled();
  });

  it("ИИ error не вытесняется опросом", () => {
    render(<JoinSidePanel {...panelProps} state="error" issues={["Ошибка генерации"]} hasActivePoll={true} />);

    expect(screen.getByText("Не получилось подготовить текст")).toBeInTheDocument();
    expect(screen.queryByText(/выбрать подарок/i)).not.toBeInTheDocument();
  });
});

describe("GiftPollVote — post-submit сценарий", () => {
  it("передаёт количество вариантов в сетку для count-aware раскладки", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: pollWithFiveOptions }) }));
    const { container } = render(<GiftPollVote publicSlug={slug} active />);

    await screen.findByRole("radiogroup");
    expect(container.querySelector("[data-count='5']")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("показывает сохранённые заголовок и вопрос, а бюджет выводит без технической подписи", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: budgetPoll }) }));
    render(<GiftPollVote publicSlug={slug} active showGreetingSuccess />);

    expect(await screen.findByRole("heading", { name: budgetPoll.title })).toBeInTheDocument();
    expect(screen.getAllByText(budgetPoll.question)).toHaveLength(2);
    expect(screen.getByRole("radiogroup", { name: budgetPoll.question })).toBeInTheDocument();
    expect(screen.getByText("Небольшой общий подарок")).toBeInTheDocument();
    expect(screen.queryByText("Общий бюджет")).not.toBeInTheDocument();
  });

  it("помечает бюджет без пояснений компактным режимом, сохраняя порядок карточек", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    const pollWithoutExplanations = { ...budgetPoll, options: budgetPoll.options.map((option) => ({ ...option, description: null })) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: pollWithoutExplanations }) }));
    const { container } = render(<GiftPollVote publicSlug={slug} active />);

    expect(await screen.findByRole("radiogroup")).toHaveAttribute("data-compact", "true");
    expect([...container.querySelectorAll("[role='radio']")].map((option) => option.id)).toEqual(["gift-poll-option-b1", "gift-poll-option-b2"]);
  });

  it("подставляет системный вопрос, если в сохранённом опросе он пустой", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: { ...budgetPoll, question: "   " } }) }));
    render(<GiftPollVote publicSlug={slug} active />);

    expect(await screen.findByRole("radiogroup", { name: "Какой бюджет лучше выбрать для подарка?" })).toBeInTheDocument();
  });

  it("до отправки поздравления ничего не показывает", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ teaser: poll }) }));
    const { container } = render(<GiftPollVote publicSlug={slug} active={false} inviteToReveal />);

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("после отправки с опросом показывает приглашение, а не форму голосования", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal showGreetingSuccess />);

    const button = await screen.findByRole("button", { name: /перейти к голосованию/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByText("Поздравление добавлено")).toHaveLength(1);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("по нажатию раскрывает полноширинную inline-секцию голосования", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal showGreetingSuccess />);

    const button = await screen.findByRole("button", { name: /перейти к голосованию/i });
    await userEvent.click(button);

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: poll.title })).toBeInTheDocument();
    expect(screen.getAllByText(poll.question)).toHaveLength(2);
    expect(screen.getByText("Поздравление добавлено")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /перейти к голосованию/i })).not.toBeInTheDocument();
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

  it("после пропуска позволяет вернуться к голосованию", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll }) }));
    render(<GiftPollVote publicSlug={slug} active showGreetingSuccess />);

    await userEvent.click(await screen.findByRole("button", { name: "Пропустить сейчас" }));
    expect(screen.getByText("Поздравление добавлено")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText(/голосование пропущено/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вернуться" })).toHaveAttribute("aria-controls", "gift-poll-section");

    await userEvent.click(screen.getByRole("button", { name: "Вернуться" }));
    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
  });

  it("уже проголосовавшему показывает компактное состояние голоса и позволяет вернуться к редактированию", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ poll: { ...poll, selectedOptionId: "o1" } }) })
    );
    render(<GiftPollVote publicSlug={slug} active={true} inviteToReveal showGreetingSuccess />);

    expect(await screen.findByText("Голос учтён")).toBeInTheDocument();
    expect(screen.getByText("Поздравление добавлено")).toBeInTheDocument();
    expect(screen.getByText("Книга")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Изменить" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /перейти к голосованию/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Изменить" }));
    expect(await screen.findByRole("button", { name: "Сохранить выбор" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /книга/i })).toHaveAttribute("aria-checked", "true");
  });

  it("после закрытия показывает участнику результаты с количеством голосов", async () => {
    window.localStorage.setItem(storageKey, crypto.randomUUID());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        poll: null,
        closed: {
          hasVote: true,
          votedOptionId: "o1",
          selectedOption: poll.options[1],
          options: [
            { ...poll.options[0], votes: 3 },
            { ...poll.options[1], votes: 5 }
          ],
          totalVotes: 8
        }
      })
    }));

    render(<GiftPollVote publicSlug={slug} active />);

    expect(await screen.findByRole("heading", { name: "Голосование завершено" })).toBeInTheDocument();
    expect(screen.getByText("Всего учтено: 8 голосов")).toBeInTheDocument();
    expect(screen.getByText("3 голоса")).toBeInTheDocument();
    expect(screen.getByText("5 голосов")).toBeInTheDocument();
    expect(screen.getByText("Ваш выбор")).toBeInTheDocument();
    expect(screen.getByText("Выбор организатора")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "книга: 38%" })).toHaveAttribute("aria-valuenow", "38");
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
