import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ManageMobileMenu } from "./manage-mobile-menu";

describe("ManageMobileMenu", () => {
  it("shows the shared manager actions and returns focus after Escape", async () => {
    const user = userEvent.setup();
    render(<ManageMobileMenu previewHref="/preview/card-1" />);

    const trigger = screen.getByRole("button", { name: "Открыть меню редактора" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Меню" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Посмотреть открытку/ })).toHaveAttribute(
      "href",
      "/preview/card-1"
    );
    expect(screen.getByRole("link", { name: /Мои открытки/ })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: /Поддержка/ })).toHaveAttribute(
      "href",
      "/support?from=manage"
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Меню" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
