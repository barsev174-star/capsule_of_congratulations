import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getPostgresPool } from "@/lib/db/postgres";
import {
  claimCriticalAlerts,
  completeCriticalAlert,
  enqueueCriticalAlert,
  failCriticalAlert
} from "./repository";

const live = process.env.RUN_CRITICAL_ALERT_DB_TEST === "1" ? describe : describe.skip;

live("critical alert PostgreSQL queue", () => {
  const event = `critical.test_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    await getPostgresPool().query("DELETE FROM critical_alert_deliveries WHERE event LIKE 'critical.test_%'");
  });

  afterAll(async () => {
    await getPostgresPool().query("DELETE FROM critical_alert_deliveries WHERE event = $1", [event]);
    await getPostgresPool().end();
  });

  it("enqueues channels, suppresses a duplicate fingerprint and persists retry state", async () => {
    const inserted = await enqueueCriticalAlert({
      errorId: randomUUID(),
      event,
      context: { operation: "integration", cardId: "card-1" },
      channels: ["email", "telegram"]
    });
    const duplicate = await enqueueCriticalAlert({
      errorId: randomUUID(),
      event,
      context: { operation: "integration", cardId: "card-2" },
      channels: ["email", "telegram"]
    });

    expect(inserted).toBe(2);
    expect(duplicate).toBe(0);

    const claimed = await claimCriticalAlerts(10);
    const ours = claimed.filter((delivery) => delivery.event === event);
    expect(ours).toHaveLength(2);

    await completeCriticalAlert(ours[0].id);
    await failCriticalAlert(ours[1].id, new Error("transport unavailable"));

    const result = await getPostgresPool().query<{ status: string; last_error: string | null }>(
      "SELECT status, last_error FROM critical_alert_deliveries WHERE event = $1 ORDER BY status",
      [event]
    );
    expect(result.rows.map((row) => row.status).sort()).toEqual(["failed", "sent"]);
    expect(result.rows.find((row) => row.status === "failed")?.last_error).toBe("transport unavailable");
  });
});
