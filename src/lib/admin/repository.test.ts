import { describe, expect, it } from "vitest";
import { getAdminDashboardStats, listAdminCards, listAdminContributions } from "./repository";

describe("admin repository", () => {
  describe("getAdminDashboardStats", () => {
    it("returns zero stats when there is no data", async () => {
      const stats = await getAdminDashboardStats();

      expect(stats.totalCards).toBeGreaterThanOrEqual(0);
      expect(stats.totalContributions).toBeGreaterThanOrEqual(0);
      expect(stats.totalMediaAssets).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByPaymentStatus.UNPAID).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByPaymentStatus.PAID).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByCollectionStatus.DRAFT).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByCollectionStatus.OPEN).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByDeliveryStatus.PREPARING).toBeGreaterThanOrEqual(0);
      expect(stats.cardsByDeliveryStatus.DELIVERED).toBeGreaterThanOrEqual(0);
    });
  });

  describe("listAdminCards", () => {
    it("returns an array", async () => {
      const cards = await listAdminCards();
      expect(Array.isArray(cards)).toBe(true);
    });

    it("filters by collection status", async () => {
      const cards = await listAdminCards({ collectionStatus: "DRAFT", limit: 10 });
      expect(Array.isArray(cards)).toBe(true);
    });
  });

  describe("listAdminContributions", () => {
    it("returns an array", async () => {
      const contributions = await listAdminContributions();
      expect(Array.isArray(contributions)).toBe(true);
    });
  });
});
