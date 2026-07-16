import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const projectRoot = process.cwd();
const uploadsRoot = join(projectRoot, "public", "uploads", "cards");
const reportDirectory = join(projectRoot, "tmp", "prelaunch-cleanup");

type Mode = "dry-run" | "execute" | "verify";
type Count = { name: string; count: number };

const args = new Set(process.argv.slice(2));
const mode: Mode = args.has("--execute") ? "execute" : args.has("--verify") ? "verify" : "dry-run";
const allowNonProduction = args.has("--allow-non-production");
const suppliedConfirmation = process.argv.find((argument) => argument.startsWith("--confirmation="))?.slice("--confirmation=".length);

const requiredDatabaseUrl = process.env.DATABASE_URL;
const expectedConfirmation = process.env.CLEANUP_PRELAUNCH_CONFIRMATION;

if (!requiredDatabaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (mode === "execute") {
  if (process.env.NODE_ENV !== "production" && !allowNonProduction) {
    throw new Error("Refusing to execute outside production. Use --allow-non-production only for an explicit rehearsal.");
  }

  if (!expectedConfirmation || !suppliedConfirmation || suppliedConfirmation !== expectedConfirmation) {
    throw new Error("A matching CLEANUP_PRELAUNCH_CONFIRMATION and --confirmation=<token> are required for --execute.");
  }
}

const client = new Client({ connectionString: requiredDatabaseUrl });

const cardTables = [
  "gift_votes",
  "gift_poll_options",
  "gift_polls",
  "contributions",
  "card_media_assets",
  "ai_generation_drafts",
  "ai_usage_events",
  "ai_card_insights",
  "ai_card_allowances",
  "event_reminders",
  "telemetry_events",
  "payment_refunds",
  "payment_events",
  "payment_attempts",
  "payment_revocations",
  "payment_orders",
  "card_audit_events",
  "cards"
] as const;

const tableExists = async (table: string) => {
  const result = await client.query<{ exists: boolean }>("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${table}`]);
  return result.rows[0]?.exists ?? false;
};

const count = async (name: string, query: string, parameters: unknown[] = []): Promise<Count> => {
  const result = await client.query<{ count: string }>(query, parameters);
  return { name, count: Number(result.rows[0]?.count ?? 0) };
};

const listFiles = async (directory: string): Promise<string[]> => {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }));
    return nested.flat();
  } catch {
    return [];
  }
};

const writeReport = async (report: unknown) => {
  await mkdir(reportDirectory, { recursive: true });
  const path = join(reportDirectory, `cleanup-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
  return path;
};

const getCardIds = async () => {
  const result = await client.query<{ id: string }>("SELECT id::text AS id FROM cards");
  return result.rows.map((row) => row.id);
};

const getStoragePaths = async () => {
  if (!(await tableExists("card_media_assets"))) return [];
  const result = await client.query<{ storage_path: string }>("SELECT storage_path FROM card_media_assets WHERE storage_path IS NOT NULL");
  return result.rows.map((row) => row.storage_path).filter(Boolean);
};

const collectCounts = async (cardIds: string[]) => {
  const ids = cardIds;
  const present = new Set<string>();
  for (const table of cardTables) {
    if (await tableExists(table)) {
      present.add(table);
    }
  }
  const counts: Count[] = [];
  const add = async (name: string, query: string) => counts.push(await count(name, query, [ids]));

  if (present.has("gift_votes")) await add("gift_votes", "SELECT count(*)::text AS count FROM gift_votes WHERE poll_id IN (SELECT id FROM gift_polls WHERE card_id = ANY($1::uuid[]))");
  if (present.has("gift_poll_options")) await add("gift_poll_options", "SELECT count(*)::text AS count FROM gift_poll_options WHERE poll_id IN (SELECT id FROM gift_polls WHERE card_id = ANY($1::uuid[]))");
  if (present.has("gift_polls")) await add("gift_polls", "SELECT count(*)::text AS count FROM gift_polls WHERE card_id = ANY($1::uuid[])");
  if (present.has("contributions")) await add("contributions", "SELECT count(*)::text AS count FROM contributions WHERE card_id = ANY($1::uuid[])");
  if (present.has("card_media_assets")) await add("card_media_assets", "SELECT count(*)::text AS count FROM card_media_assets WHERE card_id = ANY($1::uuid[])");
  if (present.has("ai_generation_drafts")) await add("ai_generation_drafts", "SELECT count(*)::text AS count FROM ai_generation_drafts WHERE card_id = ANY($1::uuid[])");
  if (present.has("ai_usage_events")) await add("ai_usage_events", "SELECT count(*)::text AS count FROM ai_usage_events WHERE card_id = ANY($1::uuid[])");
  if (present.has("ai_card_insights")) await add("ai_card_insights", "SELECT count(*)::text AS count FROM ai_card_insights WHERE card_id = ANY($1::uuid[])");
  if (present.has("ai_card_allowances")) await add("ai_card_allowances", "SELECT count(*)::text AS count FROM ai_card_allowances WHERE card_id = ANY($1::uuid[])");
  if (present.has("event_reminders")) await add("event_reminders", "SELECT count(*)::text AS count FROM event_reminders WHERE source_card_id = ANY($1::uuid[])");
  if (present.has("telemetry_events")) await add("telemetry_events", "SELECT count(*)::text AS count FROM telemetry_events WHERE card_id = ANY($1::text[])");
  for (const table of ["payment_refunds", "payment_events", "payment_attempts", "payment_revocations"]) {
    if (present.has(table)) await add(table, `SELECT count(*)::text AS count FROM ${table} WHERE order_id IN (SELECT id FROM payment_orders WHERE card_id = ANY($1::uuid[]))`);
  }
  if (present.has("payment_orders")) await add("payment_orders", "SELECT count(*)::text AS count FROM payment_orders WHERE card_id = ANY($1::uuid[])");
  if (present.has("card_audit_events")) await add("card_audit_events", "SELECT count(*)::text AS count FROM card_audit_events WHERE card_id = ANY($1::uuid[])");
  if (present.has("cards")) await add("cards", "SELECT count(*)::text AS count FROM cards WHERE id = ANY($1::uuid[])");
  if (await tableExists("organizer_magic_links")) counts.push(await count("organizer_magic_links", "SELECT count(*)::text AS count FROM organizer_magic_links"));
  return { present, counts };
};

const deleteCurrentUserData = async (cardIds: string[]) => {
  const ids = cardIds;
  const execute = async (sql: string) => client.query(sql, [ids]);
  const has = async (table: string) => tableExists(table);

  if (await has("gift_votes")) await execute("DELETE FROM gift_votes WHERE poll_id IN (SELECT id FROM gift_polls WHERE card_id = ANY($1::uuid[]))");
  if (await has("gift_poll_options")) await execute("DELETE FROM gift_poll_options WHERE poll_id IN (SELECT id FROM gift_polls WHERE card_id = ANY($1::uuid[]))");
  if (await has("gift_polls")) await execute("DELETE FROM gift_polls WHERE card_id = ANY($1::uuid[])");
  if (await has("contributions")) await execute("DELETE FROM contributions WHERE card_id = ANY($1::uuid[])");
  if (await has("card_media_assets")) await execute("DELETE FROM card_media_assets WHERE card_id = ANY($1::uuid[])");
  if (await has("ai_generation_drafts")) await execute("DELETE FROM ai_generation_drafts WHERE card_id = ANY($1::uuid[])");
  if (await has("ai_usage_events")) await execute("DELETE FROM ai_usage_events WHERE card_id = ANY($1::uuid[])");
  if (await has("ai_card_insights")) await execute("DELETE FROM ai_card_insights WHERE card_id = ANY($1::uuid[])");
  if (await has("ai_card_allowances")) await execute("DELETE FROM ai_card_allowances WHERE card_id = ANY($1::uuid[])");
  if (await has("event_reminders")) await execute("DELETE FROM event_reminders WHERE source_card_id = ANY($1::uuid[])");
  if (await has("telemetry_events")) await client.query("DELETE FROM telemetry_events WHERE card_id = ANY($1::text[])", [ids]);
  for (const table of ["payment_refunds", "payment_events", "payment_attempts", "payment_revocations"]) {
    if (await has(table)) await execute(`DELETE FROM ${table} WHERE order_id IN (SELECT id FROM payment_orders WHERE card_id = ANY($1::uuid[]))`);
  }
  if (await has("payment_orders")) await execute("DELETE FROM payment_orders WHERE card_id = ANY($1::uuid[])");
  if (await has("card_audit_events")) await execute("DELETE FROM card_audit_events WHERE card_id = ANY($1::uuid[])");
  await execute("DELETE FROM cards WHERE id = ANY($1::uuid[])");
  if (await has("organizer_magic_links")) await client.query("DELETE FROM organizer_magic_links");
};

const run = async () => {
  await client.connect();
  const cardIds = await getCardIds();
  const storagePaths = await getStoragePaths();
  const filesBefore = await listFiles(uploadsRoot);
  const before = await collectCounts(cardIds);

  if (mode === "verify") {
    const report = { mode, counts: before.counts, storageFiles: filesBefore.map((file) => relative(projectRoot, file)) };
    const failed = before.counts.some((item) => item.count !== 0) || filesBefore.length !== 0;
    const reportPath = await writeReport(report);
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
    if (failed) process.exitCode = 1;
    return;
  }

  if (mode === "execute") {
    await client.query("BEGIN");
    try {
      await deleteCurrentUserData(cardIds);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    const resolvedRoot = resolve(uploadsRoot);
    const deletedStoragePaths: string[] = [];
    const failedStoragePaths: string[] = [];
    for (const storagePath of storagePaths) {
      const resolvedPath = resolve(storagePath);
      if (!resolvedPath.startsWith(`${resolvedRoot}\\`) && resolvedPath !== resolvedRoot) {
        failedStoragePaths.push(storagePath);
        continue;
      }
      try {
        await access(resolvedPath);
        await rm(resolvedPath, { force: true });
        deletedStoragePaths.push(storagePath);
      } catch {
        failedStoragePaths.push(storagePath);
      }
    }
    const reportPath = await writeReport({ mode, before: before.counts, deletedStoragePaths, failedStoragePaths });
    console.log(JSON.stringify({ mode, reportPath, deletedStoragePaths: deletedStoragePaths.length, failedStoragePaths }, null, 2));
    if (failedStoragePaths.length) process.exitCode = 1;
    return;
  }

  const reportPath = await writeReport({ mode, counts: before.counts, storagePaths, storageFiles: filesBefore.map((file) => relative(projectRoot, file)) });
  console.log(JSON.stringify({ mode, counts: before.counts, storagePaths, reportPath }, null, 2));
};

try {
  await run();
} finally {
  await client.end();
}
