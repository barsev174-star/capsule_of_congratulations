import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ startCardFromShowcaseAction: vi.fn(), startBirthdayCardFromShowcaseAction: vi.fn() }));
vi.mock("@/app/home-actions", () => actions);
vi.mock("@/lib/client-telemetry", () => ({ sendClientTelemetry: vi.fn() }));

import { FinalCardActions } from "./final-card-actions";

describe("FinalCardActions", () => {
  it("preserves the birthday scenario when creating from the opened example", async () => {
    render(<FinalCardActions creationScenario="birthday" />);
    fireEvent.submit(screen.getByRole("button", { name: "Создать такую же открытку" }).closest("form")!);
    await waitFor(() => expect(actions.startBirthdayCardFromShowcaseAction).toHaveBeenCalledTimes(1));
    expect(actions.startCardFromShowcaseAction).not.toHaveBeenCalled();
  });
  it("shows the active public-share state and keeps management inside the private-card footer", () => {
    render(<FinalCardActions publicShare={{
      href: "/gift/final-1/share",
      label: "Настроить публичную версию",
      active: true
    }} />);

    expect(screen.getByText("Публичная версия активна")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Настроить публичную версию" })).toHaveAttribute("href", "/gift/final-1/share");
    expect(screen.getByRole("button", { name: "Создать такую же открытку" })).toHaveAttribute("type", "submit");
  });

  it("offers public-share creation without an active status for a new recipient share", () => {
    render(<FinalCardActions publicShare={{
      href: "/gift/final-2/share",
      label: "Создать публичную версию",
      active: false
    }} />);

    expect(screen.queryByText("Публичная версия активна")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Создать публичную версию" })).toHaveAttribute("href", "/gift/final-2/share");
  });

  it("never exposes management of the original private card", () => {
    const { container } = render(<FinalCardActions />);

    expect(container.querySelector('a[href^="/manage/"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/Сказать спасибо|Спасибо, очень приятно|Сохранить открытку/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать такую же открытку" })).toBeInTheDocument();
  });
});
