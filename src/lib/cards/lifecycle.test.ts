import { describe, expect, it } from "vitest";
import {
  CardLifecycleConflictError,
  assertCanCloseCollection,
  assertCanDeliverCard,
  assertCanOpenCollection,
  assertCardContentEditable,
  canDeliverCard,
  canJoinCollection,
  getCardLifecycleLabel,
  isGiftAccessible
} from "@/lib/cards/lifecycle";

const preparingCard = {
  paymentStatus: "UNPAID" as const,
  collectionStatus: "DRAFT" as const,
  deliveryStatus: "PREPARING" as const,
  activePaidOrderId: null,
  isHidden: false,
  deletedAt: null,
  purgedAt: null
};

describe("card lifecycle", () => {
  it("allows delivery only after payment and collection closure", () => {
    expect(canDeliverCard(preparingCard)).toBe(false);
    expect(canDeliverCard({ ...preparingCard, paymentStatus: "PAID", collectionStatus: "CLOSED" })).toBe(true);
  });

  it("keeps the gift inaccessible until a paid order exists", () => {
    const delivered = { ...preparingCard, paymentStatus: "PAID" as const, collectionStatus: "CLOSED" as const, deliveryStatus: "DELIVERED" as const };
    expect(isGiftAccessible(delivered)).toBe(false);
    expect(isGiftAccessible({ ...delivered, activePaidOrderId: "order_1" })).toBe(true);
  });

  it.each(["REFUNDED", "REVOKED"] as const)("revokes gift access after %s", (paymentStatus) => {
    const deliveredAndPaid = {
      ...preparingCard,
      paymentStatus: "PAID" as const,
      collectionStatus: "CLOSED" as const,
      deliveryStatus: "DELIVERED" as const,
      activePaidOrderId: "order_1"
    };

    expect(isGiftAccessible(deliveredAndPaid)).toBe(true);
    expect(isGiftAccessible({ ...deliveredAndPaid, paymentStatus })).toBe(false);
  });

  it("blocks every content edit after delivery or purge", () => {
    expect(() => assertCardContentEditable({ deliveryStatus: "DELIVERED", purgedAt: null })).toThrow(CardLifecycleConflictError);
    expect(() => assertCardContentEditable({ deliveryStatus: "PREPARING", purgedAt: "2026-07-15T00:00:00.000Z" })).toThrow(CardLifecycleConflictError);
  });

  it("rejects prohibited transitions", () => {
    expect(() => assertCanCloseCollection(preparingCard)).toThrow(CardLifecycleConflictError);
    expect(() => assertCanDeliverCard(preparingCard)).toThrow(CardLifecycleConflictError);
  });

  it("only opens a collection while the card is still being prepared", () => {
    expect(() => assertCanOpenCollection(preparingCard)).not.toThrow();
    expect(() => assertCanOpenCollection({ ...preparingCard, collectionStatus: "OPEN" })).toThrow(CardLifecycleConflictError);
    expect(() => assertCanOpenCollection({ ...preparingCard, deliveryStatus: "DELIVERED" })).toThrow(CardLifecycleConflictError);
    expect(() => assertCanOpenCollection({ ...preparingCard, purgedAt: "2026-07-15T00:00:00.000Z" })).toThrow(CardLifecycleConflictError);
  });

  it("allows joining only an open collection that has not been delivered or purged", () => {
    const openCard = { ...preparingCard, collectionStatus: "OPEN" as const };

    expect(canJoinCollection(openCard)).toBe(true);
    expect(canJoinCollection({ ...openCard, deliveryStatus: "DELIVERED" })).toBe(false);
    expect(canJoinCollection({ ...openCard, purgedAt: "2026-07-15T00:00:00.000Z" })).toBe(false);
  });

  it("rejects closing a delivered or purged collection", () => {
    const openCard = { ...preparingCard, collectionStatus: "OPEN" as const };

    expect(() => assertCanCloseCollection(openCard)).not.toThrow();
    expect(() => assertCanCloseCollection({ ...openCard, deliveryStatus: "DELIVERED" })).toThrow(CardLifecycleConflictError);
    expect(() => assertCanCloseCollection({ ...openCard, purgedAt: "2026-07-15T00:00:00.000Z" })).toThrow(CardLifecycleConflictError);
  });

  it("makes repeated delivery idempotent at the domain boundary", () => {
    expect(() => assertCanDeliverCard({ ...preparingCard, deliveryStatus: "DELIVERED" })).not.toThrow();
  });

  it("uses lifecycle labels for payment restrictions and collection progress", () => {
    expect(getCardLifecycleLabel({ ...preparingCard, paymentStatus: "REVOKED" })).toBe("Доступ приостановлен");
    expect(getCardLifecycleLabel({ ...preparingCard, paymentStatus: "REFUNDED", deliveryStatus: "DELIVERED" })).toBe("Доступ приостановлен");
    expect(getCardLifecycleLabel({ ...preparingCard, collectionStatus: "OPEN" })).toBe("Сбор поздравлений открыт");
    expect(getCardLifecycleLabel({ ...preparingCard, paymentStatus: "PAID", collectionStatus: "CLOSED" })).toBe("Готова к передаче");
  });

  it("keeps a tombstoned card inaccessible in every public flow", () => {
    const tombstone = {
      ...preparingCard,
      paymentStatus: "PAID" as const,
      collectionStatus: "CLOSED" as const,
      deliveryStatus: "DELIVERED" as const,
      activePaidOrderId: "order_1",
      purgedAt: "2026-07-15T00:00:00.000Z"
    };

    expect(isGiftAccessible(tombstone)).toBe(false);
    expect(canJoinCollection(tombstone)).toBe(false);
    expect(canDeliverCard(tombstone)).toBe(false);
    expect(() => assertCardContentEditable(tombstone)).toThrow(CardLifecycleConflictError);
  });
});
