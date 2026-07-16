import { describe, expect, it } from "vitest";
import { buildRobokassaCheckoutUrl, createRobokassaRefundJwt, formatRobokassaAmount, verifyRobokassaResult } from "./robokassa";

const config = { merchantLogin: "shop", password1: "p1", password2: "p2", isTest: true, hashAlgorithm: "md5" as const };

describe("Robokassa checkout", () => {
  it("formats the fixed price in rubles", () => {
    expect(formatRobokassaAmount(39900)).toBe("399.00");
  });

  it("includes signed custom parameters and test mode", () => {
    const url = new URL(buildRobokassaCheckoutUrl({
      config,
      amount: 39900,
      invoiceId: "123",
      description: "Slovesto",
      receipt: "{}",
      customParameters: { Shp_order: "order-1" },
      successUrl: "https://slovesto.ru/pay/success",
      failUrl: "https://slovesto.ru/pay/fail"
    }));
    expect(url.searchParams.get("OutSum")).toBe("399.00");
    expect(url.searchParams.get("IsTest")).toBe("1");
    expect(url.searchParams.get("Shp_order")).toBe("order-1");
  });

  it("verifies ResultURL signatures with password #2", () => {
    expect(verifyRobokassaResult({
      outSum: "399.000000",
      invId: "123",
      signatureValue: "a73c2117a8aed74ba8c3ac157f3250a2",
      customParameters: { Shp_order: "order-1" }
    }, config)).toBe(true);
    expect(verifyRobokassaResult({
      outSum: "399.000000",
      invId: "123",
      signatureValue: "a73c2117a8aed74ba8c3ac157f3250a2",
      customParameters: { Shp_order: "other" }
    }, config)).toBe(false);
  });

  it("creates a compact HS256 refund JWT", () => {
    const token = createRobokassaRefundJwt("operation-key", "password-3", 399);
    const [header, payload, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "HS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({ OpKey: "operation-key", RefundSum: 399 });
    expect(signature).toHaveLength(43);
  });
});
