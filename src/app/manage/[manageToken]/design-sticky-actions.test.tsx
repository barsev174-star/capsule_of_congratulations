import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DesignStickyActions } from "./design-sticky-actions";

vi.mock("./actions", () => ({
  deliverCardAction: vi.fn(),
  openCollectionAction: vi.fn()
}));

describe("DesignStickyActions", () => {
  it("replaces the lifecycle CTA with form saving when basics become dirty", () => {
    render(
      <DesignStickyActions
        manageToken="manage-token"
        primaryAction={{ kind: "link", label: "Заполнить основу", href: "#basics-section" }}
      />
    );

    expect(screen.getByRole("link", { name: "Заполнить основу" })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("manage:basics-dirty", {
          detail: { isDirty: true, isPending: false }
        })
      );
    });

    const saveButton = screen.getByRole("button", { name: "Сохранить изменения" });
    expect(saveButton).toHaveAttribute("form", "manage-basics-form");
    expect(saveButton).toHaveAttribute("type", "submit");
  });

  it("requires an explicit confirmation for the current delivery version", async () => {
    const user = userEvent.setup();
    render(
      <DesignStickyActions
        manageToken="manage-token"
        deliveryVersion="2026-08-10T10:00:00.000Z"
        deliveryWarnings={["Сохранённые фразы можно оставить без обновления."]}
        primaryAction={{ kind: "deliver", label: "Передать получателю" }}
      />
    );

    const trigger = screen.getByRole("button", { name: "Передать получателю" });
    await user.click(trigger);

    const dialog = screen.getByRole("alertdialog", { name: "Передать открытку получателю?" });
    const confirm = within(dialog).getByRole("button", { name: "Передать получателю" });
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText("Можно передать без обновления")).toBeInTheDocument();
    expect(within(dialog).getByText("Сохранённые фразы можно оставить без обновления.")).toBeInTheDocument();
    expect(dialog.querySelector('input[name="cardVersion"]')).toHaveValue("2026-08-10T10:00:00.000Z");

    await user.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
