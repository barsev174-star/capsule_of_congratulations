import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set, get: mocks.get }) }));
vi.mock("./auth", () => ({
  createOrganizerSessionToken: () => "signed-session",
  getOrganizerSessionSecret: () => "secret",
  verifyOrganizerSessionToken: vi.fn()
}));

import { setOrganizerSession } from "./session";

describe("organizer session cookie", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists passwordless access for 30 days in an HttpOnly site-wide cookie", async () => {
    await setOrganizerSession("owner@example.com");
    expect(mocks.set).toHaveBeenCalledWith("organizer_session", "signed-session", expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    }));
  });
});
