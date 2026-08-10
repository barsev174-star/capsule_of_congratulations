import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiHelper } from "./ai-helper";

const variants = [
  { id: "short" as const, label: "Короче", text: "Короткий вариант" },
  { id: "warm" as const, label: "Теплее", text: "Тёплый вариант" },
  { id: "style" as const, label: "Иначе", text: "Другой вариант" }
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AiHelper form integration", () => {
  it("does not create a nested form inside the contribution form", () => {
    const { container } = render(
      <form>
        <AiHelper
          cardId="card_test"
          publicSlug="test-card"
          occasionText="С днём рождения!"
          messageLimit={500}
          onUseText={vi.fn()}
          variant="join"
        />
      </form>
    );

    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector("button[type='button']")).toHaveTextContent("Получить 3 варианта");
  });

  it("редактирует текущее поздравление, а не начинает новое", async () => {
    const sourceText = "Анна, спасибо за твою поддержку и доброту. Желаю радости каждый день!";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { variants, generationId: "generation-1", usage: { remaining: 2 }, messageLimit: 500 } })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AiHelper
        cardId="card_test"
        manageToken="manage_test"
        occasionText="С днём рождения!"
        messageLimit={500}
        onUseText={vi.fn()}
        sourceContributionId="contribution-1"
        sourceText={sourceText}
        variant="join"
      />
    );

    expect(screen.getByText(sourceText)).toBeInTheDocument();
    expect(screen.queryByLabelText("Что хотите сказать?")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /сократить/i }));
    await userEvent.click(screen.getByRole("button", { name: "Показать варианты" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toMatchObject({
      contributionId: "contribution-1",
      draftNotes: sourceText,
      mode: "shorten",
      style: "short-no-pathos",
      editInstruction: "shorten"
    });
    expect(await screen.findByRole("button", { name: "Заменить текст этим вариантом" })).toBeInTheDocument();
  });

  it("во время повторной генерации оставляет прежние варианты на экране", async () => {
    let finishSecondRequest: ((value: unknown) => void) | undefined;
    const secondResponse = new Promise((resolve) => { finishSecondRequest = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { variants, generationId: "generation-1", usage: { remaining: 2 }, messageLimit: 500 } })
      })
      .mockReturnValueOnce(secondResponse);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AiHelper
        cardId="card_test"
        publicSlug="test-card"
        occasionText="С днём рождения!"
        messageLimit={500}
        onUseText={vi.fn()}
        variant="join"
      />
    );

    await userEvent.type(screen.getByLabelText("Что хотите сказать?"), "Спасибо за поддержку и доброту");
    await userEvent.click(screen.getByRole("button", { name: "Получить 3 варианта" }));
    expect(await screen.findByText("Короткий вариант")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Попробовать ещё" }));
    expect(await screen.findByText("Готовим ещё три варианта")).toBeInTheDocument();
    expect(screen.getByText("Короткий вариант")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Готовим ещё…" })).toBeDisabled();

    finishSecondRequest?.({
      ok: true,
      json: async () => ({ result: { variants, generationId: "generation-2", usage: { remaining: 1 }, messageLimit: 500 } })
    });
  });
});
