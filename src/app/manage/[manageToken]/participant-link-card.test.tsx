import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ParticipantLinkCard } from "./participant-link-card";

vi.mock("./close-collection-button", () => ({
  CloseCollectionButton: () => <button type="button">Закрыть сбор</button>
}));

vi.mock("./payment-checkout-button", () => ({
  PaymentCheckoutButton: () => <button type="button">Оплатить</button>
}));

describe("ParticipantLinkCard", () => {
  it("keeps the main actions and collection status visible while help stays collapsed", async () => {
    const user = userEvent.setup();
    render(
      <ParticipantLinkCard
        manageToken="manage-token"
        participantLink="/join/public-token"
        contributionCount={7}
        lifecycle={{ paymentStatus: "PAID", hasAdminAccess: false }}
      />
    );

    expect(screen.getByText("Для общего чата")).toBeInTheDocument();
    expect(screen.getByText("Сбор открыт")).toBeVisible();
    expect(screen.getByText("7 поздравлений")).toBeVisible();
    expect(screen.getByRole("button", { name: "Поделиться ссылкой для участников" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Скопировать ссылку для участников" })).toBeInTheDocument();
    const helpTrigger = screen.getByRole("button", { name: "Как работает сбор" });
    expect(helpTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Участникам — в общий чат")).not.toBeVisible();

    helpTrigger.focus();
    await user.keyboard("{Enter}");

    expect(helpTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Участникам — в общий чат")).toBeVisible();
    expect(screen.getByText("Что соберём")).toBeVisible();
    expect(screen.getByText("Поздравления и голоса за подарок")).toBeVisible();
    expect(screen.getByText("Когда всё собрано — закройте сбор")).toBeVisible();
    expect(screen.getByText(/Это не ссылка для получателя/)).toBeVisible();
  });

  it("keeps collection management and early payment collapsed by default", async () => {
    const user = userEvent.setup();
    render(
      <ParticipantLinkCard
        manageToken="manage-token"
        participantLink="/join/public-token"
        contributionCount={0}
        lifecycle={{ paymentStatus: "UNPAID", hasAdminAccess: false }}
      />
    );

    const managementTrigger = screen.getByRole("button", { name: "Управление сбором, Открыт" });
    const paymentTrigger = screen.getByRole("button", { name: "Оплата открытки, 399 ₽" });
    expect(managementTrigger).toHaveAttribute("aria-expanded", "false");
    expect(paymentTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Закрыть сбор" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Оплатить" })).not.toBeInTheDocument();

    await user.click(managementTrigger);
    expect(screen.getByRole("button", { name: "Закрыть сбор" })).toBeVisible();

    await user.click(paymentTrigger);
    expect(screen.getByText(/Сбор останется открытым/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Оплатить" })).toBeVisible();
    expect(screen.queryByText("Дополнительные действия")).not.toBeInTheDocument();
  });

  it("shows the existing paid state inside the payment disclosure", async () => {
    const user = userEvent.setup();
    render(
      <ParticipantLinkCard
        manageToken="manage-token"
        participantLink="/join/public-token"
        contributionCount={1}
        lifecycle={{ paymentStatus: "PAID", hasAdminAccess: false }}
      />
    );

    const paymentTrigger = screen.getByRole("button", { name: "Оплата открытки, Оплачено" });
    expect(screen.getByText("Оплата подтверждена")).not.toBeVisible();
    await user.click(paymentTrigger);
    expect(screen.getByText("Оплата подтверждена")).toBeVisible();
  });
});
