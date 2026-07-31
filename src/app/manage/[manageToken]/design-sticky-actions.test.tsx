import { act, render, screen } from "@testing-library/react";
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
});
