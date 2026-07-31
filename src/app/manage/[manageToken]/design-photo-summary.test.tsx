import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesignPhotoSummary } from "./design-photo-summary";

describe("DesignPhotoSummary", () => {
  it("shows only compact X/Y readiness and a focused content link", () => {
    const { container } = render(
      <DesignPhotoSummary
        assignedCount={2}
        requiredCount={3}
        context="messages"
        href="/manage/token?tab=photos&focus=congratulations-photos"
      />
    );

    expect(screen.getByText("Выбрано 2 из 3")).toBeInTheDocument();
    expect(screen.getByText(/назначить ещё одну фотографию/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Назначить фотографии" }))
      .toHaveAttribute("href", "/manage/token?tab=photos&focus=congratulations-photos");
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText(/доступно/i)).toBeNull();
  });

  it("does not offer photo assignment for a layout without photos", () => {
    const { container } = render(
      <DesignPhotoSummary assignedCount={0} requiredCount={0} context="messages" />
    );

    expect(screen.getByText("Для выбранного вида фотографии не используются.")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("uses the change action when every moment photo is assigned", () => {
    render(
      <DesignPhotoSummary
        assignedCount={3}
        requiredCount={3}
        context="memories"
        href="/manage/token?tab=photos&focus=moments-photos"
      />
    );

    expect(screen.getByText("Выбрано 3 из 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Изменить фотографии" }))
      .toHaveAttribute("href", "/manage/token?tab=photos&focus=moments-photos");
  });
});
