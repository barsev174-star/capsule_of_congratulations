import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import pg from "pg";

const host = "127.0.0.1";
const port = Number(process.env.ADMIN_SMOKE_PORT ?? 3201);
const baseUrl = `http://${host}:${port}`;
const password = `Smoke-${randomBytes(12).toString("hex")}`;
const email = `smoke-admin-${Date.now()}@example.com`;
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const userId = randomUUID();
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });

await database.connect();
await database.query(
  `INSERT INTO admin_users (id, email, password_hash, password_salt, role, created_at, updated_at)
   VALUES ($1, $2, $3, $4, 'admin', now(), now())`,
  [userId, email, hash, salt]
);

const server = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", String(port)], {
  cwd: projectDir,
  env: {
    ...process.env,
    NODE_ENV: "production"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

const waitForServer = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/admin/login`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Admin smoke server did not start. ${serverOutput.slice(-1000)}`);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/admin/login");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByRole("alert").getByText("Неверный email или пароль.", { exact: true }).waitFor({ state: "visible" });

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForTimeout(1500);
  if (page.url() !== `${baseUrl}/admin`) {
    const alert = await page.getByRole("alert").textContent().catch(() => "no alert");
    throw new Error(`Valid admin login failed at ${page.url()}: ${alert}. ${serverOutput.slice(-1200)}`);
  }
  await page.getByText(email, { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("link", { name: "Аналитика", exact: true }).waitFor({ state: "visible" });

  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await page.waitForURL("**/admin/login");
  console.log("ADMIN_SMOKE_OK invalid-login valid-login protected-route logout");
} finally {
  await browser?.close();
  server.kill();
  await database.query("DELETE FROM admin_users WHERE id = $1", [userId]);
  await database.end();
}
