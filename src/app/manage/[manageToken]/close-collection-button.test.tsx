import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloseCollectionButton } from "./close-collection-button";

vi.mock("./actions", () => ({
  closeCollectionAction: vi.fn()
}));

describe("CloseCollectionButton", () => {
  it("requires confirmation and restores focus when cancelled", async () => {
    const user = userEvent.setup();
    render(<CloseCollectionButton manageToken="manage-token" />);

    const trigger = screen.getByRole("button", { name: "Закрыть сбор" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Закрыть сбор поздравлений?" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/участники не смогут добавлять поздравления, фотографии и голоса/)).toBeInTheDocument();
    expect(screen.getByText(/финальной проверке содержания и оформления/)).toBeInTheDocument();
    expect(screen.getByText(/приватная ссылка получателя/)).toBeInTheDocument();
    const confirmButton = within(dialog).getByRole("button", { name: "Закрыть сбор" });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Оставить сбор открытым" })).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("checkbox")).toHaveFocus();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Я понимаю последствия и хочу перейти к финальной проверке."
      })
    );
    expect(confirmButton).toBeEnabled();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
