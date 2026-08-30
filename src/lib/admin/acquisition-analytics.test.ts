import { randomUUID } from "node:crypto";
import pg from "pg";
import { analyticsLandings, cohortConversion, emptyAcquisitionCounts, getAcquisitionAnalytics, sumAcquisitionCounts } from "./acquisition-analytics";
import { getTelemetrySummary } from "@/lib/telemetry-repository";

const mocks = vi.hoisted(() => ({ configured: true, query: vi.fn() }));
vi.mock("@/lib/db/postgres", () => ({
  isPostgresConfigured: () => mocks.configured,
  getPostgresPool: () => ({ query: mocks.query })
}));

describe("acquisition report", () => {
  beforeEach(() => { mocks.configured = true; mocks.query.mockReset(); });

  it("uses a common card denominator and distinguishes an empty cohort", () => {
    expect(cohortConversion(1, 3)).toBe("33,3%");
    expect(cohortConversion(0, 3)).toBe("0%");
    expect(cohortConversion(0, 0)).toBe("—");
  });

  it("totals sources without counting paid orders as additional cards", () => {
    expect(sumAcquisitionCounts([
      { ...emptyAcquisitionCounts(), created: 3, paid: 1, paidOrders: 2, grossKopecks: 79800 },
      { ...emptyAcquisitionCounts(), created: 2, paid: 1, paidOrders: 1, grossKopecks: 39900 }
    ])).toMatchObject({ created: 5, paid: 2, paidOrders: 3, grossKopecks: 119700 });
  });

  it("does not fabricate payment totals without PostgreSQL", async () => {
    mocks.configured = false;
    expect(await getAcquisitionAnalytics(7)).toBeNull();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("bounds the requested period and uses allowlisted landing paths", async () => {
    mocks.query.mockResolvedValue({ rows: [{ sources: [], landings: [], participants: { submissions: 0, identities: 0, unidentifiedSubmissions: 0 } }] });
    expect((await getAcquisitionAnalytics(-1))?.totals.created).toBe(0);
    expect(mocks.query.mock.calls[0][1]).toEqual([7, analyticsLandings.map((l) => l.id), analyticsLandings.map((l) => l.path)]);
    await getAcquisitionAnalytics(30);
    expect(mocks.query.mock.calls[1][1][0]).toBe(30);
  });
});

// The live suite shadows real table shapes with connection-local temporary tables.
// It never inserts, truncates or deletes application data and always rolls back.
const databaseTests = process.env.RUN_ANALYTICS_DB_TEST === "1" ? describe : describe.skip;
databaseTests("acquisition SQL against PostgreSQL", () => {
  let db: pg.Client;
  beforeAll(async () => {
    db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    await db.query("BEGIN");
    const tables: Record<string, string> = {
      cards: "id, created_at, delivered_at, recipient_first_opened_at",
      contributions: "id, card_id, source, participant_token_hash, created_at",
      telemetry_events: "id, kind, event, card_id, context, error_id, created_at",
      payment_orders: "id, card_id, currency, paid_at, payable_amount, total_refunded_amount",
      payment_attempts: "id, order_id, provider, status, confirmation_url, provider_payload",
      payment_events: "id, order_id, attempt_id, provider, event_type, processed_at, payload"
    };
    for (const [table, columns] of Object.entries(tables)) {
      await db.query(`CREATE TEMP TABLE ${table} ON COMMIT DROP AS SELECT ${columns} FROM public.${table} WITH NO DATA`);
    }
  });
  beforeEach(async () => {
    mocks.configured = true;
    mocks.query.mockImplementation((sql, params) => db.query(sql, params));
    await db.query("TRUNCATE pg_temp.cards, pg_temp.contributions, pg_temp.telemetry_events, pg_temp.payment_orders, pg_temp.payment_attempts, pg_temp.payment_events");
  });
  afterAll(async () => {
    if (db) { await db.query("ROLLBACK"); await db.end(); }
  });

  const card = async (days = 1, delivered = false, opened = false) => {
    const id = randomUUID();
    await db.query(`INSERT INTO cards VALUES ($1, now() - ($2 * interval '1 day'),
      CASE WHEN $3 THEN now() END, CASE WHEN $4 THEN now() END)`, [id, days, delivered, opened]);
    return id;
  };
  const event = async (name: string, cardId: string | null, context: object = {}, days = 0) => {
    await db.query(`INSERT INTO telemetry_events VALUES ($1, 'funnel', $2, $3, $4, NULL, now() - ($5 * interval '1 day'))`,
      [randomUUID(), name, cardId, context, days]);
  };
  const payment = async (cardId: string, options: { test?: boolean; confirmed?: boolean; refunded?: number; duplicate?: boolean } = {}) => {
    const order = randomUUID(), attempt = randomUUID();
    await db.query("INSERT INTO payment_orders VALUES ($1, $2, 'RUB', now(), 39900, $3)", [order, cardId, options.refunded ?? 0]);
    await db.query("INSERT INTO payment_attempts VALUES ($1, $2, 'robokassa', 'SUCCEEDED', $3, '{}'::jsonb)",
      [attempt, order, `https://auth.robokassa.ru/Merchant/Index.aspx?InvId=1${options.test ? "&IsTest=1" : ""}`]);
    if (options.confirmed !== false) {
      for (let i = 0; i < (options.duplicate ? 2 : 1); i++) {
        await db.query("INSERT INTO payment_events VALUES ($1, $2, $3, 'robokassa', 'payment_succeeded', now(), '{}'::jsonb)", [randomUUID(), order, attempt]);
      }
    }
    return { order, attempt };
  };
  const attribution = (id = "teacher") => ({
    landing_type: id, landing_path: analyticsLandings.find((l) => l.id === id)?.path,
    utm_source: "yandex", utm_medium: "organic", utm_campaign: "school"
  });

  it("counts cards once, keeps first touch and separates participants from manual greetings", async () => {
    const first = await card(6, true, true), second = await card(1), old = await card(40);
    await event("funnel.card_created", first, attribution(), 6);
    await event("funnel.card_created", first, attribution("colleague"), 1);
    await event("funnel.card_created", second, attribution(), 1);
    for (const [target, source, token] of [[first, "participant", "same"], [first, "participant", "same"], [first, "participant", null], [first, "manual", null], [second, "participant", "same"], [old, "participant", "old-card"]]) {
      await db.query("INSERT INTO contributions VALUES ($1, $2, $3, $4, now())", [randomUUID(), target, source, token]);
    }
    await payment(first, { duplicate: true, refunded: 10000 });
    await payment(first);
    await payment(old);
    const result = (await getAcquisitionAnalytics(7))!;
    expect(result.totals).toEqual({ created: 2, withGreeting: 2, paid: 1, delivered: 1, opened: 1, paidOrders: 2, grossKopecks: 79800, refundedKopecks: 10000 });
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]).toMatchObject({ landing: "teacher", source: "yandex", medium: "organic", campaign: "school" });
    expect(result.participants).toEqual({ submissions: 5, identities: 3, unidentifiedSubmissions: 1 });
  });

  it("excludes test payments, manually marked orders and free access from sales", async () => {
    const test = await card(), manual = await card(), refunded = await card();
    await card(1, true, true);
    await payment(test, { test: true });
    await payment(manual, { confirmed: false });
    await payment(refunded, { refunded: 39900 });
    const result = (await getAcquisitionAnalytics(7))!;
    expect(result.totals).toMatchObject({ created: 4, paid: 1, delivered: 1, opened: 1, grossKopecks: 39900, refundedKopecks: 39900 });
  });

  it("also rejects test flags preserved in callback payloads", async () => {
    const { attempt } = await payment(await card());
    await db.query(`UPDATE payment_attempts SET provider_payload = '{"result":{"IsTest":"1"}}' WHERE id = $1`, [attempt]);
    expect((await getAcquisitionAnalytics(7))!.totals.paid).toBe(0);
  });

  it("keeps unknown attribution distinct, validates landing pairs and bounds time", async () => {
    const invalid = await card(), unknown = await card(), older = await card(8);
    await card(-1);
    await event("funnel.card_created", invalid, { ...attribution(), landing_path: "/wrong" });
    await event("funnel.card_created", unknown);
    await event("funnel.card_created", older, attribution("caregiver"), 8);
    await event("seo_landing_view", null, attribution(), 1);
    await event("seo_landing_view", null, attribution(), 1);
    await event("seo_example_click", null, attribution("caregiver"), 1);
    await event("seo_create_click", null, attribution("colleague"), 1);
    await event("seo_landing_view", null, { ...attribution(), landing_path: "/wrong" });
    await event("seo_landing_view", null, attribution(), -1);
    const week = (await getAcquisitionAnalytics(7))!;
    expect(week.sources).toEqual([{ ...emptyAcquisitionCounts(), created: 2, landing: null, source: null, medium: null, campaign: null }]);
    expect(week.landings).toEqual([
      { landing: "birthday", views: 0, exampleClicks: 0, createClicks: 0 },
      { landing: "caregiver", views: 0, exampleClicks: 1, createClicks: 0 },
      { landing: "colleague", views: 0, exampleClicks: 0, createClicks: 1 },
      { landing: "teacher", views: 2, exampleClicks: 0, createClicks: 0 }
    ]);
    expect((await getAcquisitionAnalytics(30))!.totals.created).toBe(3);
  });

  it("aggregates over 10,000 events without dropping errors or AI costs", async () => {
    await event("ai.join_single_generation", "one", {
      action: "initial",
      extractorModel: "gpt://folder/yandexgpt-5.1",
      composerModel: "gpt://folder/yandexgpt-5.1",
      cacheHit: false,
      extractorUsage: { totalRub: 0.1, inputTokens: 100, outputTokens: 20, totalTokens: 120 },
      composerUsage: { totalRub: 0.15, inputTokens: 200, outputTokens: 50, totalTokens: 250 },
      repairUsage: [],
      totalCostRub: 0.25
    });
    await event("ai.join_single_generation", "one", {
      action: "warmer",
      extractorModel: "gpt://folder/yandexgpt-5.1",
      composerModel: "gpt://folder/yandexgpt-5.1",
      cacheHit: true,
      extractorUsage: null,
      composerUsage: { totalRub: 0.3, inputTokens: 240, outputTokens: 60, totalTokens: 300 },
      repairUsage: [{ totalRub: 0.2, inputTokens: 100, outputTokens: 40, totalTokens: 140 }],
      repairReason: ["missing_wish"],
      totalCostRub: 0.5
    });
    await event("ai.two_stage_generation", "one", { totalCostRub: "not-a-number" });
    await db.query(`INSERT INTO telemetry_events
      SELECT md5('event-' || g)::uuid, 'funnel', 'seo_landing_view', NULL, $1::jsonb, NULL, now()
      FROM generate_series(1, 10050) g`, [attribution()]);
    await db.query(`INSERT INTO telemetry_events
      SELECT md5('error-' || g)::uuid, 'critical', 'critical.database', NULL, '{}'::jsonb, md5('error-' || g)::uuid, now()
      FROM generate_series(1, 35) g`);
    expect((await getAcquisitionAnalytics(7))!.landings.find((l) => l.landing === "teacher")?.views).toBe(10050);
    const summary = await getTelemetrySummary(7);
    expect(summary.totalEvents).toBe(10088);
    expect(summary.criticalErrors).toBe(35);
    expect(summary.recentCritical).toHaveLength(30);
    expect(summary.aiCost).toMatchObject({
      generations: 2,
      cards: 1,
      totalRub: 0.75,
      averageGenerationRub: 0.375,
      averageCardRub: 0.75,
      extractorRub: 0.1,
      composerRub: 0.45,
      repairRub: 0.2,
      repairs: 1,
      cacheHits: 1
    });
    expect(summary.aiCost.recent).toHaveLength(2);
    expect(summary.aiCost.recent.map((item) => item.action).sort()).toEqual(["initial", "warmer"]);
  });

  it("attributes birthday cards and activity to their own landing", async () => {
    const id = await card();
    const birthday = { ...attribution("birthday"), utm_campaign: "birthday" };
    await event("funnel.card_created", id, birthday);
    for (const name of ["seo_landing_view", "seo_example_click", "seo_create_click"]) {
      await event(name, null, birthday);
    }
    const result = (await getAcquisitionAnalytics(7))!;
    expect(result.sources).toEqual([expect.objectContaining({ landing: "birthday", campaign: "birthday", created: 1 })]);
    expect(result.landings.find((landing) => landing.landing === "birthday")).toEqual({ landing: "birthday", views: 1, exampleClicks: 1, createClicks: 1 });
  });

  it("returns explicit empty aggregates", async () => {
    expect((await getAcquisitionAnalytics(7))!.totals).toEqual(emptyAcquisitionCounts());
    expect((await getTelemetrySummary(7)).aiCost.totalRub).toBe(0);
  });
});
