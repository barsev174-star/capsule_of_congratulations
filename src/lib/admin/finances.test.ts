import pg from "pg";
import { randomUUID } from "node:crypto";
const mocks = vi.hoisted(() => ({ pool: null as unknown as pg.Pool }));
vi.mock("@/lib/db/postgres", () => ({ isPostgresConfigured: () => true, getPostgresPool: () => mocks.pool }));
import { requestAdminRefundOnce } from "./finances";
import { cancelAdminReminder } from "./reminders";

const databaseTests = process.env.RUN_ADMIN_DB_TEST === "1" ? describe : describe.skip;
databaseTests("administrative refund protection", () => {
  const schema = `admin_qa_${randomUUID().replaceAll("-", "")}`;
  let connection: pg.Client;
  beforeAll(async () => {
    connection = new pg.Client({ connectionString: process.env.DATABASE_URL }); await connection.connect();
    await connection.query(`CREATE SCHEMA ${schema}`);
    for (const table of ["payment_orders","payment_refunds","admin_action_events","admin_users","event_reminders"]) await connection.query(`CREATE TABLE ${schema}.${table} AS SELECT * FROM public.${table} WITH NO DATA`);
    mocks.pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
  });
  afterAll(async () => { if (mocks.pool) await mocks.pool.end(); if (connection) { await connection.query(`DROP SCHEMA ${schema} CASCADE`); await connection.end(); } });
  const order = async () => { const id = randomUUID(); await mocks.pool.query("INSERT INTO payment_orders(id,status,total_refunded_amount,provider_order_id) VALUES($1,'PAID',0,'qa-invoice')", [id]); return id; };
  it("serializes concurrent confirmations and calls the provider once", async () => {
    const id = await order(); const provider = vi.fn().mockResolvedValue("qa-request");
    await Promise.all([requestAdminRefundOnce(id,"qa","qa@example.com",provider), requestAdminRefundOnce(id,"qa","qa@example.com",provider)]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect((await mocks.pool.query("SELECT count(*)::int AS count FROM admin_action_events WHERE object_id=$1 AND action='refund.request_started'", [id])).rows[0].count).toBe(1);
  });
  it("keeps an unknown provider result blocked instead of dispatching again", async () => {
    const id = await order(); const provider = vi.fn().mockRejectedValue(new Error("network result unknown"));
    await expect(requestAdminRefundOnce(id,"qa","qa@example.com",provider)).rejects.toThrow("network result unknown");
    await requestAdminRefundOnce(id,"qa","qa@example.com",provider);
    expect(provider).toHaveBeenCalledTimes(1);
    const events = (await mocks.pool.query("SELECT actor_id,action,result FROM admin_action_events WHERE object_id=$1", [id])).rows;
    expect(events.some((row) => row.action === "refund.request_unknown" && row.result === "failed")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("qa@example.com");
  });
  it("cancels a reminder once and does not cancel one already claimed for delivery", async () => {
    const pending = randomUUID(), sending = randomUUID();
    await mocks.pool.query("INSERT INTO event_reminders(id,status,remind_on) VALUES($1,'pending',current_date),($2,'sending',current_date)", [pending, sending]);
    await cancelAdminReminder(pending, "qa@example.com");
    await cancelAdminReminder(pending, "qa@example.com");
    await cancelAdminReminder(sending, "qa@example.com");
    expect((await mocks.pool.query("SELECT status FROM event_reminders WHERE id=$1", [pending])).rows[0].status).toBe("cancelled");
    expect((await mocks.pool.query("SELECT status FROM event_reminders WHERE id=$1", [sending])).rows[0].status).toBe("sending");
    expect((await mocks.pool.query("SELECT count(*)::int AS count FROM admin_action_events WHERE object_id=$1", [pending])).rows[0].count).toBe(1);
  });
});
