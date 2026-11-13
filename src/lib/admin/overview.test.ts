import pg from "pg";
import { randomUUID } from "node:crypto";
import { overviewSql } from "./overview";
import { formatMoney, parsePeriod } from "./format";

describe("admin report formatting", () => {
  it("keeps kopecks separate from rubles and allows only supported periods", () => {
    expect(formatMoney(39900).replaceAll("\u00a0", " ")).toBe("399 ₽");
    expect(formatMoney(-5050).replaceAll("\u00a0", " ")).toBe("-50,5 ₽");
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("all")).toBeNull();
    expect(parsePeriod("-1")).toBe(7);
  });
});

const databaseTests = process.env.RUN_ADMIN_DB_TEST === "1" ? describe : describe.skip;
databaseTests("overview against PostgreSQL", () => {
  let db: pg.Client;
  const until = new Date();
  const date = (days: number) => new Date(until.getTime() - days * 86400000);
  beforeAll(async () => {
    db = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await db.connect(); await db.query("BEGIN");
    for (const table of ["cards", "contributions", "card_media_assets", "event_reminders", "payment_orders", "payment_attempts", "payment_events", "payment_refunds", "support_requests", "telemetry_events"]) {
      await db.query(`CREATE TEMP TABLE ${table} ON COMMIT DROP AS SELECT * FROM public.${table} WITH NO DATA`);
    }
  });
  beforeEach(async () => { await db.query("TRUNCATE pg_temp.cards, pg_temp.contributions, pg_temp.card_media_assets, pg_temp.event_reminders, pg_temp.payment_orders, pg_temp.payment_attempts, pg_temp.payment_events, pg_temp.payment_refunds, pg_temp.support_requests, pg_temp.telemetry_events"); });
  afterAll(async () => { if (db) { await db.query("ROLLBACK"); await db.end(); } });
  const card = async (days = 1, test = false) => {
    const id = randomUUID();
    await db.query("INSERT INTO cards(id, created_at, is_test, collection_status, delivery_status) VALUES($1,$2,$3,'OPEN','PREPARING')", [id, date(days), test]);
    return id;
  };
  const sale = async (cardId: string, days = 1, test = false) => {
    const id = randomUUID(), attempt = randomUUID();
    await db.query("INSERT INTO payment_orders(id,card_id,currency,payable_amount,paid_at) VALUES($1,$2,'RUB',39900,$3)", [id, cardId, date(days)]);
    await db.query("INSERT INTO payment_attempts(id,order_id,provider,status,confirmation_url) VALUES($1,$2,'robokassa','SUCCEEDED',$3)", [attempt, id, `https://auth.robokassa.ru/Merchant/Index.aspx?InvId=1${test ? "&IsTest=1" : ""}`]);
    await db.query("INSERT INTO payment_events(id,order_id,attempt_id,provider,event_type,processed_at) VALUES($1,$2,$3,'robokassa','payment_succeeded',$4)", [randomUUID(), id, attempt, date(days)]);
    return id;
  };
  const report = async (financial = true, days: number | null = 7) => (await db.query(overviewSql, [days === null ? null : date(days), until, days === null ? null : date(days * 2), financial, financial])).rows[0].overview;
  it("counts cards once, excludes test cards and sandbox payments, and ignores grants", async () => {
    const paid = await card(); await sale(paid); await sale(paid);
    await sale(await card(1, true)); await sale(await card(), 1, true);
    await card();
    const result = await report();
    expect(result.current).toMatchObject({ created: 3, paid: 1, revenue: 79800, active: 3 });
    expect(result.activity).toHaveLength(5);
  });
  it("deducts refunds by completion date even for sales outside the current window", async () => {
    const old = await sale(await card(20), 20);
    await db.query("INSERT INTO payment_refunds(id,order_id,amount,status,completed_at) VALUES($1,$2,39900,'SUCCEEDED',$3)", [randomUUID(), old, date(1)]);
    await db.query("INSERT INTO payment_refunds(id,order_id,amount,status,completed_at) VALUES($1,$2,39900,'PROCESSING',$3)", [randomUUID(), old, date(1)]);
    expect((await report()).current).toMatchObject({ paid: 0, revenue: -39900 });
    expect((await report(true, null)).current.revenue).toBe(0);
  });
  it("uses disjoint previous windows and keeps current active counts explicit", async () => {
    await card(8); await card(1);
    const result = await report();
    expect(result.current.created).toBe(1); expect(result.previous.created).toBe(1);
    expect(result.current.active).toBe(2); expect((await report(true, null)).previous).toBeNull();
  });
  it("does not expose financial or reminder metrics to support", async () => {
    await sale(await card());
    const result = await report(false);
    expect(result.current.paid).toBeNull(); expect(result.current.revenue).toBeNull(); expect(result.current.reminders).toBeNull();
    expect(result.activity).toEqual([]);
  });
});
