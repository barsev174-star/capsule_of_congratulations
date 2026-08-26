import { chromium, devices } from "playwright-core";
import { createHash, randomUUID, randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL ?? "smoke@invalid.example";
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const stamp = Date.now();
const errors = [];
let createdCardId = "";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  const createData = new FormData();
  createData.set("recipientName", `Smoke ${stamp}`);
  createData.set("fromLabel", "От автоматической проверки");
  createData.set("occasionText", "С днём рождения!");
  createData.set("occasion", "personal");
  createData.set("organizerName", "Smoke Test");
  createData.set("organizerEmail", email);
  createData.set("templateId", "paper-birthday");
  const createResponse = await fetch(`${baseUrl}/api/cards`, { method: "POST", body: createData });
  assert(createResponse.ok, `Card creation failed: ${createResponse.status}`);
  const createPayload = await createResponse.json();
  const { card, manageLink: manageUrl, participantLink: joinUrl, finalLink: giftUrl } = createPayload.result ?? {};
  assert(card?.id && card?.manageToken && manageUrl && joinUrl && giftUrl, "Create API did not expose all card routes.");
  createdCardId = card.id;

  const openResponse = await fetch(`${baseUrl}/api/cards/${card.manageToken}/collection/open`, { method: "POST" });
  assert(openResponse.ok, `Collection opening failed: ${openResponse.status}`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  const localize = (url) => `${baseUrl}${new URL(url).pathname}`;
  await page.goto(localize(joinUrl), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  assert(await page.locator("input[name='cardId']").inputValue() === createdCardId, "Join page exposes an unexpected card id.");
  await page.getByPlaceholder("Например, Ольга", { exact: true }).fill("Smoke participant");
  await page
    .getByPlaceholder("Напишите несколько теплых слов: что цените, за что благодарны, какой момент хочется вспомнить...", { exact: true })
    .fill("Желаю радости, вдохновения и прекрасных моментов каждый день!");
  await page.getByRole("checkbox", { name: /Я согласен на обработку моего имени и поздравления/ }).check();
  await page.getByRole("button", { name: "Подарить слова", exact: true }).click();
  await page.waitForTimeout(1200);
  const joinResultText = await page.locator("body").innerText();
  assert(
    joinResultText.includes("Поздравление добавлено"),
    `Contribution was not accepted. Page state: ${joinResultText.slice(0, 1800)}`
  );

  await page.goto(localize(manageUrl), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  assert(await page.getByText("Бумажный классический", { exact: true }).count(), "Default template is not visible.");

  await page.goto(`${localize(manageUrl)}?tab=photos`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Добавить фото, позиция/ }).first().click();
  await page.locator("input[type='file']").setInputFiles({
    name: "smoke.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
  });
  await page.getByRole("checkbox", { name: /Подтверждаю, что имею право использовать/ }).check();
  await page.getByRole("button", { name: "Добавить фото", exact: true }).click();
  await page.getByText("Фото добавлено", { exact: true }).waitFor({ state: "visible" });

  if (process.env.DATABASE_URL) {
    const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      const admin = await database.query("SELECT id FROM admin_users ORDER BY created_at ASC LIMIT 1");
      assert(admin.rows[0]?.id, "Local admin is required for a QA access grant.");
      const grantId = randomUUID();
      await database.query(
        `INSERT INTO card_access_grants (id, card_id, status, reason_code, comment, granted_by_admin_id)
         VALUES ($1, $2, 'ACTIVE', 'QA_TEST', 'Automated local smoke test', $3)`,
        [grantId, createdCardId, admin.rows[0].id]
      );
      await database.query(
        `UPDATE cards
         SET active_access_grant_id = $2,
             collection_status = 'CLOSED',
             collection_closed_at = COALESCE(collection_closed_at, now()),
             delivery_status = 'DELIVERED',
             delivered_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [createdCardId, grantId]
      );
    } finally {
      await database.end();
    }
  }
  await page.goto(localize(giftUrl), { waitUntil: "domcontentloaded" });
  const skipIntro = page.getByRole("button", { name: "Пропустить", exact: true });
  if (await skipIntro.isVisible()) await skipIntro.click();
  await page.waitForFunction(() => document.body.innerText.includes("Smoke participant"), null, { timeout: 15000 });

  for (const target of [
    { name: "desktop", options: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", options: { ...devices["iPhone 14"], viewport: { width: 390, height: 844 } } }
  ]) {
    const checkContext = await browser.newContext(target.options);
    const checkPage = await checkContext.newPage();
    await checkPage.goto(localize(giftUrl), { waitUntil: "domcontentloaded" });
    const dimensions = await checkPage.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert(dimensions.scrollWidth <= dimensions.width + 1, `${target.name}: horizontal overflow detected.`);
    await checkContext.close();
  }

  if (process.env.DATABASE_URL) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      await database.query(
        `INSERT INTO organizer_magic_links (id, email, token_hash, expires_at, used_at, created_at)
         VALUES ($1, $2, $3, now() + interval '15 minutes', NULL, now())`,
        [randomUUID(), email, tokenHash]
      );
    } finally {
      await database.end();
    }

    await page.goto(`${baseUrl}/account/verify?token=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(`${baseUrl}/account`);
    let accountCard = page.locator("article").filter({ hasText: `Smoke ${stamp}` });
    assert(await accountCard.count() === 1, "Created card is missing from organizer account.");
    await accountCard.getByRole("button", { name: "Удалить", exact: true }).click();
    await accountCard.getByText("Удалена", { exact: true }).waitFor({ state: "visible" });

    const errorCountBeforeExpected404 = errors.length;
    const deletedJoinResponse = await page.goto(localize(joinUrl), { waitUntil: "domcontentloaded" });
    assert(deletedJoinResponse?.status() === 404, "Deleted card is still public on /join.");

    await page.goto(`${baseUrl}/account`, { waitUntil: "domcontentloaded" });
    accountCard = page.locator("article").filter({ hasText: `Smoke ${stamp}` });
    await accountCard.getByRole("button", { name: "Восстановить", exact: true }).click();
    await accountCard.getByRole("link", { name: "Управлять", exact: true }).waitFor({ state: "visible" });
    const restoredJoinResponse = await page.goto(localize(joinUrl), { waitUntil: "domcontentloaded" });
    assert(restoredJoinResponse?.status() === 200, "Restored card did not return to /join.");
    errors.splice(errorCountBeforeExpected404);
  }

  assert(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);
  console.log(`SMOKE_OK manage=${new URL(manageUrl).pathname} join=${new URL(joinUrl).pathname} gift=${new URL(giftUrl).pathname}`);
  await context.close();
} finally {
  await browser.close();
  if (createdCardId && process.env.DATABASE_URL) {
    const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      await database.query("DELETE FROM organizer_magic_links WHERE email = $1", [email]);
      await database.query("UPDATE cards SET active_access_grant_id = NULL WHERE id = $1", [createdCardId]);
      await database.query("DELETE FROM card_access_grants WHERE card_id = $1", [createdCardId]);
      await database.query("DELETE FROM cards WHERE id = $1", [createdCardId]);
    } finally {
      await database.end();
    }
    await rm(join(process.cwd(), "public", "uploads", "cards", createdCardId), { recursive: true, force: true });
  }
}
