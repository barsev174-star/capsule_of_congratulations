import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Contribution } from "@/lib/cards/types";
import { MessagesSection } from "./messages-section";
import styles from "./final-card.module.css";

const createContributions = (count: number): Contribution[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `contrib-${index}`,
    cardId: "card-1",
    authorName: `Автор ${index + 1}`,
    authorRole: null,
    authorAvatarUrl: null,
    message: `Поздравление номер ${index + 1}`,
    createdAt: new Date().toISOString()
  }));

const getCardByAuthor = (author: string) => {
  const authorElement = screen.getByText(author);
  return authorElement.closest("article") as HTMLElement;
};

describe("MessagesSection", () => {
  it("renders only 4 messages initially", () => {
    render(
      <MessagesSection
        contributions={createContributions(6)}
        messageLayoutMode="grid-2"
        messageMediaAssets={[]}
        messageMediaLayout="portrait"
        isPaperBirthday={false}
      />
    );

    expect(getCardByAuthor("Автор 1")).not.toHaveClass(styles.cardHidden);
    expect(getCardByAuthor("Автор 4")).not.toHaveClass(styles.cardHidden);
    expect(getCardByAuthor("Автор 5")).toHaveClass(styles.cardHidden);
    expect(screen.getByText("Показано 4 из 6")).toBeInTheDocument();
  });

  it("shows load more button and loads 5 more messages on click", async () => {
    const user = userEvent.setup();
    render(
      <MessagesSection
        contributions={createContributions(12)}
        messageLayoutMode="grid-2"
        messageMediaAssets={[]}
        messageMediaLayout="portrait"
        isPaperBirthday={false}
      />
    );

    expect(getCardByAuthor("Автор 5")).toHaveClass(styles.cardHidden);

    const button = screen.getByRole("button", { name: "Показать ещё 5 поздравлений" });
    await user.click(button);

    expect(getCardByAuthor("Автор 9")).not.toHaveClass(styles.cardHidden);
    expect(getCardByAuthor("Автор 10")).toHaveClass(styles.cardHidden);
    expect(screen.getByText("Показано 9 из 12")).toBeInTheDocument();
  });

  it("loads remaining messages when fewer than 5 are left", async () => {
    const user = userEvent.setup();
    render(
      <MessagesSection
        contributions={createContributions(7)}
        messageLayoutMode="grid-2"
        messageMediaAssets={[]}
        messageMediaLayout="portrait"
        isPaperBirthday={false}
      />
    );

    const button = screen.getByRole("button", { name: "Показать ещё 3 поздравлений" });
    await user.click(button);

    expect(getCardByAuthor("Автор 7")).not.toHaveClass(styles.cardHidden);
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).not.toBeInTheDocument();
  });

  it("hides load more button when all messages are visible initially", () => {
    render(
      <MessagesSection
        contributions={createContributions(3)}
        messageLayoutMode="grid-2"
        messageMediaAssets={[]}
        messageMediaLayout="portrait"
        isPaperBirthday={false}
      />
    );

    expect(getCardByAuthor("Автор 3")).not.toHaveClass(styles.cardHidden);
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).not.toBeInTheDocument();
  });

  it("adds a mobile-only route trigger after the first four greetings", () => {
    render(
      <MessagesSection
        contributions={createContributions(12)}
        messageLayoutMode="grid-2"
        messageMediaAssets={[]}
        messageMediaLayout="portrait"
        isPaperBirthday={false}
        isRouteAdventure
      />
    );

    expect(screen.getByRole("button", { name: "Показать все 12 сообщений" })).toBeInTheDocument();
  });
});
