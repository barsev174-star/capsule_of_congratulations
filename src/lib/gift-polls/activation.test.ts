import { describe, expect, it, vi } from "vitest";
import { ensureGiftPollEnabled } from "./activation";

describe("ensureGiftPollEnabled", () => {
  it("creates one empty gift poll with the system copy", async () => {
    const getPoll = vi.fn(async () => null);
    const createPoll = vi.fn(async (input) => ({ id: "poll-id", ...input }));

    await expect(ensureGiftPollEnabled("card-id", { getPoll, createPoll })).resolves.toEqual({ created: true });
    expect(createPoll).toHaveBeenCalledWith({
      cardId: "card-id",
      mode: "gift",
      title: "Помогите выбрать подарок",
      question: "Какой вариант лучше выбрать для подарка?",
      closesAt: null
    });
  });

  it("does not overwrite a poll that already exists", async () => {
    const getPoll = vi.fn(async () => ({ id: "poll-id" }));
    const createPoll = vi.fn();

    await expect(ensureGiftPollEnabled("card-id", { getPoll, createPoll } as never)).resolves.toEqual({ created: false });
    expect(createPoll).not.toHaveBeenCalled();
  });
});
