import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNav } from "./admin-nav";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock
}));

describe("AdminNav", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/admin/cards");
  });

  it("marks only the cards section as active on the cards route", () => {
    render(<AdminNav role="admin" />);

    expect(screen.getByRole("link", { name: "Открытки" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});
