import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CardDraft, Contribution } from "@/lib/cards/types";

const mocks = vi.hoisted(() => ({
  getCard: vi.fn(), visible: vi.fn(), all: vi.fn(), updateMain: vi.fn(), updateDetails: vi.fn(),
  create: vi.fn(), reorder: vi.fn(), access: vi.fn(), lifecycle: vi.fn(), revalidate: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/cards/repository", async (original) => ({
  ...await original<typeof import("@/lib/cards/repository")>(),
  getCardDraftByManageToken: mocks.getCard,
  listContributionsByCardId: mocks.visible,
  listAllContributionsByCardId: mocks.all,
  updateCardMainGreetingSettings: mocks.updateMain,
  updateContributionDetails: mocks.updateDetails,
  reorderContributions: mocks.reorder
}));
vi.mock("@/lib/cards/service", () => ({ createContribution: mocks.create }));
vi.mock("@/lib/manage/access", () => ({ requireCardManagementAccess: mocks.access, requireCardOrganizer: vi.fn() }));
vi.mock("@/lib/cards/lifecycle-repository", async (original) => ({
  ...await original<typeof import("@/lib/cards/lifecycle-repository")>(),
  getCardLifecycleByManageToken: mocks.lifecycle
}));

import { saveOrganizerContributionAction, setMainGreetingAction } from "./actions";

const card = {
  id: "card-1", publicSlug: "public", finalSlug: "final", deliveryStatus: "PREPARING", purgedAt: null,
  finalMainGreetingSettings: { contributionId: "old-main" }, finalMessageSettings: null
} as CardDraft;
const contribution: Contribution = {
  id: "new-main", cardId: card.id, authorName: "Анна", authorRole: null, authorAvatarUrl: null,
  message: "Желаю тебе прекрасных событий, счастья и радости каждый день!", sortOrder: 0, status: "visible", source: "manual",
  createdAt: "2026-11-12T00:00:00.000Z", updatedAt: "2026-11-12T00:00:00.000Z"
};
const form = (fields: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [name, value] of Object.entries({ manageToken: "manage-1", contributionId: contribution.id, ...fields })) data.set(name, value);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCard.mockResolvedValue(card);
  mocks.lifecycle.mockResolvedValue(card);
  mocks.access.mockResolvedValue({});
  mocks.visible.mockResolvedValue([contribution]);
  mocks.all.mockResolvedValue([contribution]);
  mocks.updateMain.mockResolvedValue(card);
  mocks.updateDetails.mockResolvedValue(contribution);
  mocks.create.mockResolvedValue(contribution);
});

describe("main greeting server actions", () => {
  it("replaces the main greeting with a visible greeting and revalidates card surfaces", async () => {
    mocks.visible.mockResolvedValue([{ ...contribution, message: "Я".repeat(700) }]);
    expect(await setMainGreetingAction(form())).toMatchObject({ ok: true });
    expect(mocks.updateMain).toHaveBeenCalledExactlyOnceWith(card.id, { contributionId: contribution.id });
    expect(mocks.access).toHaveBeenCalledWith(card.id, { allowGuestDraft: true });
    expect(mocks.revalidate).toHaveBeenCalledWith("/manage/manage-1");
    expect(mocks.revalidate).toHaveBeenCalledWith("/gift/final");
  });

  it.each(["", "missing", "hidden", "deleted", "another-card-greeting"])("rejects unavailable selection '%s' without clearing the current main greeting", async (id) => {
    expect(await setMainGreetingAction(form({ contributionId: id }))).toMatchObject({ ok: false });
    expect(mocks.updateMain).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects a greeting longer than 700 characters", async () => {
    mocks.visible.mockResolvedValue([{ ...contribution, message: "Я".repeat(701) }]);
    expect(await setMainGreetingAction(form())).toMatchObject({ ok: false, message: expect.stringContaining("700") });
    expect(mocks.updateMain).not.toHaveBeenCalled();
  });

  it("reports missing management links and missing cards", async () => {
    expect(await setMainGreetingAction(form({ manageToken: "" }))).toMatchObject({ ok: false });
    mocks.getCard.mockResolvedValue(null);
    expect(await setMainGreetingAction(form())).toMatchObject({ ok: false });
    expect(mocks.updateMain).not.toHaveBeenCalled();
  });

  it("does not report success when persistence fails", async () => {
    mocks.updateMain.mockResolvedValue(null);
    expect(await setMainGreetingAction(form())).toMatchObject({ ok: false });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("checks access and the content lock before changing the main greeting", async () => {
    mocks.access.mockRejectedValueOnce(new Error("Нет доступа"));
    await expect(setMainGreetingAction(form())).rejects.toThrow("Нет доступа");
    mocks.lifecycle.mockResolvedValue({ ...card, deliveryStatus: "DELIVERED" });
    await expect(setMainGreetingAction(form())).rejects.toThrow("уже передана");
    expect(mocks.updateMain).not.toHaveBeenCalled();
  });

  it.each([true, false])("creates a new greeting and assigns it as main only when requested (%s)", async (isMain) => {
    const data = form({ contributionId: "", authorName: contribution.authorName, message: contribution.message, isMainGreeting: String(isMain), status: "visible" });
    expect(await saveOrganizerContributionAction({ ok: false, message: "" }, data)).toMatchObject({ ok: true, contributionId: contribution.id });
    expect(mocks.create).toHaveBeenCalledOnce();
    if (isMain) expect(mocks.updateMain).toHaveBeenCalledWith(card.id, { contributionId: contribution.id });
    else expect(mocks.updateMain).not.toHaveBeenCalled();
  });

  it("saves shortened text and assigns that greeting as main", async () => {
    mocks.all.mockResolvedValue([{ ...contribution, message: "Я".repeat(701) }]);
    const data = form({ authorName: contribution.authorName, message: contribution.message, isMainGreeting: "true", status: "visible" });
    expect(await saveOrganizerContributionAction({ ok: false, message: "" }, data)).toMatchObject({ ok: true });
    expect(mocks.updateDetails).toHaveBeenCalledWith(contribution.id, expect.objectContaining({ message: contribution.message }));
    expect(mocks.updateMain).toHaveBeenCalledWith(card.id, { contributionId: contribution.id });
  });
});
