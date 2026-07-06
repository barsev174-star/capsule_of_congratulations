import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const port = Number(process.env.RETENTION_SMOKE_PORT ?? 3202);
const baseUrl = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString("hex");
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: projectDir,
  env: { ...process.env, NODE_ENV: "production", CRON_SECRET: secret },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(`${baseUrl}/create`);
    if (response.ok) break;
  } catch {}
  if (attempt === 39) throw new Error(`Retention smoke server did not start. ${serverOutput.slice(-1000)}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();
const cardIds = [];
const email = `retention-smoke-${Date.now()}@invalid.example`;

const createCard = async (recipientName) => {
  const formData = new FormData();
  formData.set("recipientName", recipientName);
  formData.set("fromLabel", "От проверки retention");
  formData.set("occasionText", "Тест хранения");
  formData.set("occasion", "personal");
  formData.set("organizerName", "Retention smoke");
  formData.set("organizerEmail", email);
  formData.set("templateId", "paper-birthday");
  const response = await fetch(`${baseUrl}/api/cards`, { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Card creation failed: ${response.status}`);
  const payload = await response.json();
  cardIds.push(payload.result.card.id);
  return payload.result.card.id;
};

try {
  const deletedCardId = await createCard("Deleted retention smoke");
  const inactiveDraftId = await createCard("Inactive draft smoke");
  const activeDraftId = await createCard("Recently active draft smoke");
  await database.query(
    "UPDATE cards SET deleted_at = now() - interval '31 days', purge_after = now() - interval '1 day' WHERE id = $1",
    [deletedCardId]
  );
  await database.query(
    "UPDATE cards SET updated_at = now() - interval '91 days' WHERE id = $1",
    [inactiveDraftId]
  );
  await database.query("UPDATE cards SET updated_at = now() - interval '91 days' WHERE id = $1", [activeDraftId]);
  await database.query(
    `INSERT INTO contributions (
       id, card_id, author_name, author_role, author_avatar_url, message,
       sort_order, status, source, created_at, updated_at
     ) VALUES ($1, $2, 'Recent participant', NULL, NULL, 'Recent activity keeps this draft alive.', 0, 'visible', 'manual', now(), now())`,
    [randomUUID(), activeDraftId]
  );

  const response = await fetch(`${baseUrl}/api/internal/retention/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` }
  });
  if (!response.ok) throw new Error(`Retention endpoint failed: ${response.status}`);
  const result = await response.json();
  if (result.deleted < 1 || result.inactiveDrafts < 1) {
    throw new Error(`Retention counts are incomplete: ${JSON.stringify(result)}`);
  }

  const purgedRemaining = await database.query(
    "SELECT count(*)::text AS count FROM cards WHERE id = ANY($1::uuid[])",
    [[deletedCardId, inactiveDraftId]]
  );
  if (Number(purgedRemaining.rows[0]?.count ?? 0) !== 0) throw new Error("Retention cards were not permanently removed.");
  const activeRemaining = await database.query("SELECT count(*)::text AS count FROM cards WHERE id = $1", [activeDraftId]);
  if (Number(activeRemaining.rows[0]?.count ?? 0) !== 1) throw new Error("Recent contribution activity did not protect its draft.");
  console.log("RETENTION_SMOKE_OK deleted recovery-expiry inactive-draft recent-activity-protection");
} finally {
  if (cardIds.length > 0) await database.query("DELETE FROM cards WHERE id = ANY($1::uuid[])", [cardIds]);
  await database.query("DELETE FROM organizer_magic_links WHERE email = $1", [email]);
  await database.end();
  server.kill();
}
