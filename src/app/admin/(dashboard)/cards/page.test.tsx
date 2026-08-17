import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft } from "@/lib/cards/types";
import { listAdminCards } from "@/lib/admin/repository";
import AdminCardsPage from "./page";

const activeCard: CardDraft = {
  id: "605df8b9-8115-4b10-bc4b-9304e05f34bf",
  publicSlug: "public-card",
  manageToken: "manage-card",
  finalSlug: "final-card",
  recipientName: "Наталья Афанасьевна",
  occasion: "birthday",
  occasionText: "С Днём Рождения!",
  fromLabel: "от коллег",
  organizerName: "Сергей Барыкин",
  organizerEmail: "sergey@example.com",
  eventDate: "2026-08-19",
  description: null,
  signature: null,
  templateId: "school-scrapbook",
  finalBlockSettings: null,
  finalBlockOrder: null,
  finalMessageSettings: null,
  finalMainGreetingSettings: null,
  finalMemorySettings: null,
  status: "collecting",
  paymentStatus: "UNPAID",
  collectionStatus: "OPEN",
  deliveryStatus: "PREPARING",
  deletedAt: null,
  purgeAt: null,
  createdAt: "2026-08-16T09:00:00.000Z",
  updatedAt: "2026-08-16T09:30:00.000Z"
};

const deletedCard: CardDraft = {
  ...activeCard,
  id: "a05df8b9-8115-4b10-bc4b-9304e05f34bf",
  recipientName: "Удалённая открытка",
  manageToken: "deleted-manage-card",
  deletedAt: "2026-08-16T10:00:00.000Z"
};

vi.mock("@/lib/admin/session", () => ({
  requireAdminRole: vi.fn()
}));

vi.mock("@/lib/admin/repository", () => ({
  listAdminCards: vi.fn()
}));

describe("AdminCardsPage", () => {
  beforeEach(() => {
    vi.mocked(listAdminCards).mockResolvedValue([activeCard, deletedCard]);
  });

  it("shows complete card data and valid action routes", async () => {
    render(await AdminCardsPage({ searchParams: Promise.resolve({}) }));

    const activeRow = screen.getByRole("link", { name: "Наталья Афанасьевна" }).closest("tr");
    expect(activeRow).not.toBeNull();
    expect(within(activeRow!).getByText("С Днём Рождения!")).toBeInTheDocument();
    expect(within(activeRow!).getByText("Сергей Барыкин")).toBeInTheDocument();
    expect(within(activeRow!).getByText("sergey@example.com")).toBeInTheDocument();
    expect(within(activeRow!).getByText("16.08.2026")).toBeInTheDocument();
    expect(within(activeRow!).getByRole("link", { name: "Детали и доступ" })).toHaveAttribute(
      "href",
      `/admin/cards/${activeCard.id}`
    );
    expect(within(activeRow!).getByRole("link", { name: "Управлять" })).toHaveAttribute("href", "/manage/manage-card");
    expect(within(activeRow!).getByRole("link", { name: "Предпросмотр" })).toHaveAttribute("href", "/preview/manage-card");
  });

  it("does not expose user routes for a deleted card", async () => {
    render(await AdminCardsPage({ searchParams: Promise.resolve({}) }));

    const deletedRow = screen.getByRole("link", { name: "Удалённая открытка" }).closest("tr");
    expect(deletedRow).not.toBeNull();
    expect(within(deletedRow!).getByText("Удалена")).toBeInTheDocument();
    expect(within(deletedRow!).getByRole("link", { name: "Детали и доступ" })).toHaveAttribute(
      "href",
      `/admin/cards/${deletedCard.id}`
    );
    expect(within(deletedRow!).getByText("Пользовательские действия недоступны")).toBeInTheDocument();
    expect(within(deletedRow!).queryByRole("link", { name: "Управлять" })).not.toBeInTheDocument();
    expect(within(deletedRow!).queryByRole("link", { name: "Предпросмотр" })).not.toBeInTheDocument();
  });
});
