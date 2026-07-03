import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  countRecentMagicLinks: vi.fn(),
  storeMagicLink: vi.fn(),
  deleteUnusedMagicLink: vi.fn(),
  consumeMagicLink: vi.fn(),
  sendOrganizerAccessEmail: vi.fn()
}));

vi.mock("./repository", () => ({
  countRecentMagicLinks: mocks.countRecentMagicLinks,
  storeMagicLink: mocks.storeMagicLink,
  deleteUnusedMagicLink: mocks.deleteUnusedMagicLink,
  consumeMagicLink: mocks.consumeMagicLink
}));
vi.mock("./email", () => ({ sendOrganizerAccessEmail: mocks.sendOrganizerAccessEmail }));

import { requestOrganizerAccess } from "./service";

describe("requestOrganizerAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countRecentMagicLinks.mockResolvedValue(0);
    mocks.storeMagicLink.mockResolvedValue(undefined);
    mocks.deleteUnusedMagicLink.mockResolvedValue(undefined);
  });

  it("removes an unused token when email delivery fails", async () => {
    mocks.sendOrganizerAccessEmail.mockRejectedValue(new Error("provider rejected email"));

    await expect(requestOrganizerAccess("user@example.com")).rejects.toThrow("provider rejected email");

    expect(mocks.storeMagicLink).toHaveBeenCalledOnce();
    expect(mocks.deleteUnusedMagicLink).toHaveBeenCalledOnce();
  });

  it("keeps the token after successful delivery", async () => {
    mocks.sendOrganizerAccessEmail.mockResolvedValue(undefined);

    await expect(requestOrganizerAccess("user@example.com")).resolves.toMatchObject({ limited: false });

    expect(mocks.deleteUnusedMagicLink).not.toHaveBeenCalled();
  });
});
