import pg from "pg";

let db: pg.Client;
vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => true,
  getPostgresPool: () => ({
    query: (sql: string, values?: unknown[]) => db.query(sql, values),
    connect: async () => ({ query: (sql: string, values?: unknown[]) => db.query(sql, values), release: () => {} })
  })
}));
vi.mock("@/lib/telemetry", () => ({ trackFunnel: vi.fn() }));

import { createEmptyCardDraft } from "@/lib/cards/service";
import { claimCardOrganizerEmail, getCardDraftByManagementId, updateCardDraftBasics } from "@/lib/cards/repository";
import { consumeMagicLink, getPendingOrganizerEmailChange, storeMagicLink } from "@/lib/organizer/repository";

// Every mutation is confined to connection-local tables, which vanish on disconnect.
const databaseTests = process.env.RUN_DRAFT_ACCESS_DB_TEST === "1" ? describe : describe.skip;
databaseTests("draft ownership PostgreSQL boundaries", () => {
  beforeAll(async () => {
    db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    for (const table of ["cards", "card_recovery_tokens", "organizer_magic_links"]) {
      await db.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
    }
  });
  beforeEach(async () => {
    await db.query("TRUNCATE pg_temp.cards, pg_temp.card_recovery_tokens, pg_temp.organizer_magic_links");
  });
  afterAll(async () => { if (db) await db.end(); });

  it("preserves a confirmed owner if a draft basics save started before confirmation", async () => {
    const { card } = await createEmptyCardDraft();
    const owner = await claimCardOrganizerEmail(card.id, "owner@example.com");
    expect(owner?.organizerEmail).toBe("owner@example.com");
    await updateCardDraftBasics(card.id, {
      recipientName: "Анна", occasion: "personal", occasionText: "С праздником!", fromLabel: "Друзья",
      organizerName: "Мария", eventDate: null, description: null, signature: null
    });
    expect((await getCardDraftByManagementId(card.id))?.organizerEmail).toBe("owner@example.com");
    expect(await claimCardOrganizerEmail(card.id, "other@example.com")).toBeNull();
  });

  it("invalidates the previous pending claim and consumes the replacement only once", async () => {
    const { card } = await createEmptyCardDraft();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await storeMagicLink("old@example.com", "old-hash", expires, { claimCardId: card.id });
    await storeMagicLink("new@example.com", "new-hash", expires, { claimCardId: card.id });
    expect(await consumeMagicLink("old-hash")).toBeNull();
    expect((await getPendingOrganizerEmailChange(card.id, "claim"))?.email).toBe("new@example.com");
    expect((await getCardDraftByManagementId(card.id))?.organizerEmail).toBe("");
    const claim = await consumeMagicLink("new-hash");
    expect(claim).toMatchObject({ email: "new@example.com", claimCardId: card.id });
    expect(await consumeMagicLink("new-hash")).toBeNull();
  });
});
