import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft } from "@/lib/cards/types";
import { updateCardBasicsAction } from "./actions";
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
    vi.mocked(updateCardBasicsAction).mockReset();
    vi.mocked(updateCardBasicsAction).mockImplementation(async (_state, formData) => ({
      ok: true,
      message: "Изменения сохранены.",
      fields: {
        recipientName: String(formData.get("recipientName") ?? ""),
        fromLabel: String(formData.get("fromLabel") ?? ""),
        occasionText: String(formData.get("occasionText") ?? ""),
        organizerName: String(formData.get("organizerName") ?? ""),
        organizerEmail: String(formData.get("organizerEmail") ?? ""),
        eventDate: String(formData.get("eventDate") ?? ""),
        description: String(formData.get("description") ?? ""),
        signature: String(formData.get("signature") ?? "")
      }
    }));
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

  it("saves the event date immediately after it is selected", async () => {
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    fireEvent.change(screen.getByLabelText("Дата события"), { target: { value: "2026-09-01" } });

    await waitFor(() => expect(updateCardBasicsAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(updateCardBasicsAction).mock.calls[0]?.[1];
    expect(submitted?.get("eventDate")).toBe("2026-09-01");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("saves the closing signature after leaving the field", async () => {
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    const signature = screen.getByLabelText("Подпись в конце открытки");
    fireEvent.change(signature, { target: { value: "Короче поздравляем!" } });
    fireEvent.blur(signature);

    await waitFor(() => expect(updateCardBasicsAction).toHaveBeenCalledOnce());
    const submitted = vi.mocked(updateCardBasicsAction).mock.calls[0]?.[1];
    expect(submitted?.get("signature")).toBe("Короче поздравляем!");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
