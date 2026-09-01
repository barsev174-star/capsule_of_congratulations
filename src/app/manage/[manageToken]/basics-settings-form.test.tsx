import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft } from "@/lib/cards/types";
import {
  cancelOrganizerEmailChangeAction,
  requestOrganizerEmailChangeAction,
  revokeRecoveryLinksAction,
  rotateRecoveryLinkAction,
  updateCardBasicsAction
} from "./actions";
import { BasicsSettingsForm } from "./basics-settings-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh })
}));

vi.mock("./actions", () => ({
  cancelOrganizerEmailChangeAction: vi.fn(),
  requestOrganizerEmailChangeAction: vi.fn(),
  resendOrganizerAccessAction: vi.fn(),
  revokeRecoveryLinksAction: vi.fn(),
  rotateRecoveryLinkAction: vi.fn(),
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
    vi.mocked(cancelOrganizerEmailChangeAction).mockReset();
    vi.mocked(requestOrganizerEmailChangeAction).mockReset();
    vi.mocked(revokeRecoveryLinksAction).mockReset();
    vi.mocked(rotateRecoveryLinkAction).mockReset();
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

  it("keeps rare access controls collapsed and uses explicit recovery labels", async () => {
    const user = userEvent.setup();
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    expect(screen.getByText("Организатор")).toBeInTheDocument();
    expect(screen.queryByText("Контакт организатора")).not.toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email владельца" })).not.toBeInTheDocument();
    const securitySummary = screen.getByText("Доступ и безопасность").closest("summary");
    expect(securitySummary?.parentElement).not.toHaveAttribute("open");

    await user.click(securitySummary!);

    expect(screen.getByRole("button", { name: "Создать новую резервную ссылку" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отозвать все резервные ссылки" })).toBeInTheDocument();
    expect(screen.getByText(/сама ссылка не открывает управление/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Создать новую" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отозвать все" })).not.toBeInTheDocument();
  });

  it("changes the owner email in a dedicated confirmation dialog", async () => {
    const user = userEvent.setup();
    vi.mocked(requestOrganizerEmailChangeAction).mockResolvedValue({
      ok: true,
      message: "Подтверждение отправлено.",
      pendingEmailChange: {
        email: "new@example.com",
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
      }
    });
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    await user.click(screen.getByText("Доступ и безопасность").closest("summary")!);
    await user.click(screen.getByRole("button", { name: "Изменить email" }));

    const dialog = screen.getByRole("dialog", { name: "Изменить email владельца" });
    expect(within(dialog).getByText("maria@example.com")).toBeInTheDocument();
    const email = within(dialog).getByRole("textbox", { name: "Новый email" });
    await user.type(email, "new@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Отправить подтверждение" }));

    await waitFor(() => {
      expect(requestOrganizerEmailChangeAction).toHaveBeenCalledWith("manage-token", "new@example.com");
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Ожидает подтверждения")).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Отправить ещё раз через 60 с/ })).toBeDisabled();
  });

  it("explains the consequences before replacing or revoking reserve links", async () => {
    const user = userEvent.setup();
    vi.mocked(rotateRecoveryLinkAction).mockResolvedValue({
      ok: true,
      message: "Новая резервная ссылка создана.",
      recoveryUrl: "/manage/new-link"
    });
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    await user.click(screen.getByText("Доступ и безопасность").closest("summary")!);
    await user.click(screen.getByRole("button", { name: "Создать новую резервную ссылку" }));

    const dialog = screen.getByRole("alertdialog", { name: "Создать новую резервную ссылку?" });
    expect(within(dialog).getByText(/вход по email владельца не изменятся/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Создать ссылку" }));
    await waitFor(() => expect(rotateRecoveryLinkAction).toHaveBeenCalledWith("manage-token"));

    await user.click(screen.getByRole("button", { name: "Отозвать все резервные ссылки" }));
    const revokeDialog = screen.getByRole("alertdialog", { name: "Отозвать все резервные ссылки?" });
    expect(within(revokeDialog).getByText(/вход по email владельца сохранится/i)).toBeInTheDocument();
  });

  it("shows the generated reserve secret once and provides a copy action", async () => {
    const user = userEvent.setup();
    vi.mocked(rotateRecoveryLinkAction).mockResolvedValue({
      ok: true,
      message: "Новая резервная ссылка создана.",
      recoveryUrl: "/manage/new-secret"
    });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    await user.click(screen.getByText("Доступ и безопасность").closest("summary")!);
    await user.click(screen.getByRole("button", { name: "Создать новую резервную ссылку" }));
    await user.click(screen.getByRole("button", { name: "Создать ссылку" }));

    expect(await screen.findByText("Резервная ссылка создана")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Новая резервная ссылка" })).toHaveValue("/manage/new-secret");
    await user.click(screen.getByRole("button", { name: "Скопировать ссылку" }));
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/manage/new-secret");
  });

  it("renders and cancels a persisted pending email transfer", async () => {
    const user = userEvent.setup();
    vi.mocked(cancelOrganizerEmailChangeAction).mockResolvedValue({
      ok: true,
      message: "Смена email отменена."
    });
    render(
      <BasicsSettingsForm
        manageToken="manage-token"
        card={buildCard()}
        initialPendingEmailChange={{
          email: "pending@example.com",
          createdAt: new Date(Date.now() - 120_000).toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60_000).toISOString()
        }}
      />
    );

    await user.click(screen.getByText("Доступ и безопасность").closest("summary")!);
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Отменить смену" }));
    await waitFor(() => expect(cancelOrganizerEmailChangeAction).toHaveBeenCalledWith("manage-token"));
    expect(screen.queryByText("pending@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Изменить email" })).toBeInTheDocument();
  });

  it("uses the empty reserve-link state after revocation", async () => {
    const user = userEvent.setup();
    vi.mocked(revokeRecoveryLinksAction).mockResolvedValue({
      ok: true,
      message: "Все резервные ссылки отозваны."
    });
    render(<BasicsSettingsForm manageToken="manage-token" card={buildCard()} />);

    await user.click(screen.getByText("Доступ и безопасность").closest("summary")!);
    await user.click(screen.getByRole("button", { name: "Отозвать все резервные ссылки" }));
    await user.click(screen.getByRole("button", { name: "Отозвать ссылки" }));

    await waitFor(() => expect(revokeRecoveryLinksAction).toHaveBeenCalledWith("manage-token"));
    expect(screen.getByText(/Резервная ссылка не создана/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать резервную ссылку" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Отозвать все резервные ссылки" })).not.toBeInTheDocument();
  });
});
