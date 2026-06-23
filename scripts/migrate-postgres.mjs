import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Example: postgres://user:password@localhost:5432/capsule");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "migrations");
const client = new Client({
  connectionString: databaseUrl
});

const run = async () => {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const appliedResult = await client.query("SELECT version FROM schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.version));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), "utf8");
    console.log(`apply ${file}`);

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(version) VALUES($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("migrations complete");
};

try {
  await run();
} finally {
  await client.end();
}
