import { describe, expect, it } from "vitest";
import { hasFinalAccess } from "./access-grants";

describe("administrative card access", () => {
  it("allows final access through an active grant without a paid order", () => {
    expect(hasFinalAccess({ paymentStatus: "UNPAID", activePaidOrderId: null, activeGrant: { id: "grant", cardId: "card", status: "ACTIVE", reasonCode: "QA_TEST", comment: "Local QA", expiresAt: null } })).toBe(true);
  });

  it("does not treat an expired or revoked grant as payment access", () => {
    expect(hasFinalAccess({ paymentStatus: "UNPAID", activePaidOrderId: null, activeGrant: { id: "grant", cardId: "card", status: "EXPIRED", reasonCode: "QA_TEST", comment: "Local QA", expiresAt: null } })).toBe(false);
    expect(hasFinalAccess({ paymentStatus: "UNPAID", activePaidOrderId: null, activeGrant: { id: "grant", cardId: "card", status: "ACTIVE", reasonCode: "QA_TEST", comment: "Local QA", expiresAt: "2020-01-01T00:00:00.000Z" } })).toBe(false);
  });
});
