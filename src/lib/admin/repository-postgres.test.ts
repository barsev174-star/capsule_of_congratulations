import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresCardRow } from "@/lib/cards/repository-postgres";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn()
}));

vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => true,
  getPostgresPool: () => ({ query: queryMock })
}));

import { listAdminCards } from "./repository";

const row = {
  id: "605df8b9-8115-4b10-bc4b-9304e05f34bf",
  public_slug: "public-card",
  manage_token: "manage-card",
  final_slug: "final-card",
  recipient_name: "Наталья Афанасьевна",
  occasion: "birthday",
  occasion_text: "С Днём Рождения!",
  from_label: "от коллег",
  organizer_name: "Сергей Барыкин",
  organizer_email: "sergey@example.com",
  event_date: "2026-08-19",
  description: null,
  signature: "Короче поздравляем!",
  template_id: "school-scrapbook",
  final_block_settings: null,
  final_block_order: null,
  final_message_settings: null,
  final_main_greeting_settings: null,
  final_memory_settings: null,
  payment_status: "UNPAID",
  collection_status: "OPEN",
  delivery_status: "PREPARING",
  is_hidden: false,
  deleted_at: null,
  purged_at: null,
  created_at: "2026-08-16T09:00:00.000Z",
  updated_at: "2026-08-16T09:30:00.000Z"
} as PostgresCardRow;

describe("listAdminCards with PostgreSQL", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [row] });
  });

  it("maps database columns to CardDraft and excludes purged tombstones", async () => {
    const cards = await listAdminCards({ limit: 50 });

    expect(cards[0]).toMatchObject({
      id: row.id,
      recipientName: "Наталья Афанасьевна",
      occasionText: "С Днём Рождения!",
      organizerName: "Сергей Барыкин",
      organizerEmail: "sergey@example.com",
      manageToken: "manage-card",
      createdAt: "2026-08-16T09:00:00.000Z"
    });
    expect(queryMock.mock.calls[0]?.[0]).toContain("purged_at IS NULL");
  });

  it("preserves a PostgreSQL date value as the selected calendar day", async () => {
    queryMock.mockResolvedValue({
      rows: [{ ...row, event_date: new Date(2026, 7, 22) }]
    });

    const cards = await listAdminCards({ limit: 50 });

    expect(cards[0]?.eventDate).toBe("2026-08-22");
  });
});
