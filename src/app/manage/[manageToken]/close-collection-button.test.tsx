import { render, screen } from "@testing-library/react";
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

    expect(
      screen.getByRole("dialog", { name: "Закрыть сбор поздравлений?" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Участники временно не смогут добавлять поздравления/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/фото/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Оставить сбор открытым" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
