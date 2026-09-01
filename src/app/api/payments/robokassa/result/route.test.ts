import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  getAccount: vi.fn(),
  getConfig: vi.fn(),
  verify: vi.fn()
}));

vi.mock("@/lib/payments/repository", () => ({ confirmRobokassaPayment: mocks.confirm }));
vi.mock("@/lib/payments/merchant-accounts", () => ({ getMerchantAccountById: mocks.getAccount }));
vi.mock("@/lib/payments/robokassa", () => ({
  getRobokassaConfig: mocks.getConfig,
  verifyRobokassaResult: mocks.verify
}));

import { GET, POST } from "./route";

describe("Robokassa ResultURL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccount.mockResolvedValue({ id: "merchant-1" });
    mocks.getConfig.mockReturnValue({ merchantLogin: "merchant" });
    mocks.verify.mockReturnValue(true);
    mocks.confirm.mockResolvedValue(undefined);
  });

  it("rejects a callback before touching payment state when the signature is invalid", async () => {
    mocks.verify.mockReturnValue(false);
    const response = await GET(new Request("http://localhost/api/payments/robokassa/result?OutSum=399.00&InvId=10&SignatureValue=bad&Shp_order=o1&Shp_account=merchant-1"));
    expect(response.status).toBe(400);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("confirms a signed form callback and returns the provider acknowledgement", async () => {
    const body = new URLSearchParams({
      OutSum: "399.00",
      InvId: "10",
      SignatureValue: "valid",
      Shp_order: "order-1",
      Shp_account: "merchant-1"
    });
    const response = await POST(new Request("http://localhost/api/payments/robokassa/result", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body
    }));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("OK10");
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "10",
      merchantAccountId: "merchant-1",
      outSum: "399.00"
    }));
  });
});
