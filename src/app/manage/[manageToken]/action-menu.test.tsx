import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionMenu, MenuDeleteIcon, MenuEditIcon } from "./action-menu";
import styles from "./manage-page.module.css";

describe("ActionMenu", () => {
  it("opens, moves focus with arrows and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(
      <ActionMenu label="Меню фотографии">
        <button type="button" role="menuitem" className={styles.actionMenuItem}><MenuEditIcon />Настроить</button>
        <button type="button" role="menuitem" className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}><MenuDeleteIcon />Удалить</button>
      </ActionMenu>
    );

    const trigger = screen.getByRole("button", { name: "Меню фотографии" });
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Настроить" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Удалить" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes after an enabled action and reports the open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ActionMenu label="Действия" onOpenChange={onOpenChange}>
        <button type="button" role="menuitem" className={styles.actionMenuItem}>Открыть</button>
      </ActionMenu>
    );

    await user.click(screen.getByRole("button", { name: "Действия" }));
    await user.click(screen.getByRole("menuitem", { name: "Открыть" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
