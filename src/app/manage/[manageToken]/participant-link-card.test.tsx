import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ParticipantLinkCard } from "./participant-link-card";

vi.mock("./close-collection-button", () => ({
  CloseCollectionButton: () => <button type="button">Закрыть сбор</button>
}));

vi.mock("./payment-checkout-button", () => ({
  PaymentCheckoutButton: () => <button type="button">Оплатить</button>
}));

describe("ParticipantLinkCard", () => {
  it("makes the participant link audience, purpose and next step explicit", () => {
    render(
      <ParticipantLinkCard
        manageToken="manage-token"
        participantLink="/join/public-token"
        contributionCount={7}
        lifecycle={{ paymentStatus: "PAID", hasAdminAccess: false }}
      />
    );

    expect(screen.getByText("Для общего чата")).toBeInTheDocument();
    expect(screen.getByText("Участникам — в общий чат")).toBeInTheDocument();
    expect(screen.getByText("Собрать поздравления, фотографии и голоса за подарок")).toBeInTheDocument();
    expect(screen.getByText("Дождитесь материалов, затем закройте сбор")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поделиться ссылкой для участников" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Скопировать ссылку для участников" })).toBeInTheDocument();
    expect(screen.getByText(/Это не ссылка для получателя/)).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Когда закрывать сбор")).toBeInTheDocument();
  });

  it("shows early payment as a visible action instead of hiding it", () => {
    render(
      <ParticipantLinkCard
        manageToken="manage-token"
        participantLink="/join/public-token"
        contributionCount={0}
        lifecycle={{ paymentStatus: "UNPAID", hasAdminAccess: false }}
      />
    );

    expect(screen.getByRole("heading", { name: "Оплата открытки" })).toBeInTheDocument();
    expect(screen.getByText("399 ₽")).toBeInTheDocument();
    expect(screen.getByText(/Сбор останется открытым/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Оплатить" })).toBeInTheDocument();
    expect(screen.queryByText("Дополнительные действия")).not.toBeInTheDocument();
  });
});
