import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft } from "@/lib/cards/types";
import { BasicsSettingsForm } from "./basics-settings-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

vi.mock("./actions", () => ({
  resendOrganizerAccessAction: vi.fn(),
  updateCardBasicsAction: vi.fn()
}));

const buildCard = (overrides: Partial<CardDraft> = {}): CardDraft => ({
  id: "card-id",
  publicSlug: "public-slug",
  manageToken: "manage-token",
  finalSlug: "final-slug",
  recipientName: "Анна Викторовна",
  occasion: "birthday",
  occasionText: "С днём рождения!",
  fromLabel: "от коллег",
  organizerName: "Мария",
  organizerEmail: "maria@example.com",
  eventDate: null,
  description: null,
  signature: null,
  templateId: "paper-birthday",
  finalBlockSettings: null,
  finalBlockOrder: null,
  finalMessageSettings: null,
  finalMainGreetingSettings: null,
  finalMemorySettings: null,
  status: "draft",
  paymentStatus: "UNPAID",
  collectionStatus: "DRAFT",
  deliveryStatus: "PREPARING",
  deletedAt: null,
  purgeAt: null,
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
  ...overrides
});

describe("BasicsSettingsForm mobile summary", () => {
  beforeEach(() => {
    refresh.mockReset();
    window.history.replaceState(null, "", "/manage/manage-token");
  });

  it("starts collapsed when required data is ready and exposes a concise summary", async () => {
    const user = userEvent.setup();
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    const summary = screen.getByText("Анна Викторовна").closest("div");
    expect(summary).not.toBeNull();
    expect(within(summary!).getByText(/от коллег/)).toBeInTheDocument();
    expect(within(summary!).getByText("Контакт организатора указан")).toBeInTheDocument();
    expect(within(summary!).queryByText("maria@example.com")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Изменить" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Свернуть");
  });

  it("starts expanded when a required field is missing", () => {
    render(
      <BasicsSettingsForm
        manageToken="manage-token"
        card={buildCard({ organizerEmail: "" })}
      />
    );

    expect(screen.getByRole("button", { name: "Свернуть" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByText("Нужно заполнить")).toBeInTheDocument();
  });
});
