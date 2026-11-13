import { createAdminSessionToken } from "./auth";
const mocks = vi.hoisted(() => ({ cookie: "", user: null as { role: string; disabledAt?: string } | null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: mocks.cookie }) }) }));
vi.mock("./repository-phase2", () => ({ getAdminUserByEmail: async () => mocks.user }));
import { getAdminSession, requireAdminRole } from "./session";
describe("current administrative permissions", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com"); vi.stubEnv("ADMIN_PASSWORD_HASH", "hash"); vi.stubEnv("ADMIN_PASSWORD_SALT", "salt"); vi.stubEnv("ADMIN_SESSION_SECRET", "qa-secret");
    mocks.cookie = createAdminSessionToken("operator@example.com", "admin", "qa-secret"); mocks.user = { role: "admin" };
  });
  afterEach(() => vi.unstubAllEnvs());
  it("applies a role downgrade despite the elevated role in an older cookie", async () => {
    mocks.user = { role: "support" };
    expect((await getAdminSession())?.role).toBe("support");
    await expect(requireAdminRole("admin")).rejects.toThrow("Forbidden");
    expect((await requireAdminRole("support")).role).toBe("support");
  });
  it("revokes a deleted account on its next request", async () => {
    mocks.user = null;
    expect(await getAdminSession()).toBeNull();
    await expect(requireAdminRole("support")).rejects.toThrow("Unauthorized");
  });
  it("revokes a disabled account even when its signed session is unexpired", async () => {
    mocks.user = { role: "admin", disabledAt: new Date().toISOString() };
    expect(await getAdminSession()).toBeNull();
    await expect(requireAdminRole("admin")).rejects.toThrow("Unauthorized");
  });
  it("retains the explicitly configured environment owner login", async () => {
    mocks.user = null; mocks.cookie = createAdminSessionToken("owner@example.com", "admin", "qa-secret");
    expect((await getAdminSession())?.role).toBe("admin");
  });
});
