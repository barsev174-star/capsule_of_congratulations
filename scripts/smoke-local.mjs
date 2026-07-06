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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${baseUrl}/create`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Имя получателя", { exact: true }).fill(`Smoke ${stamp}`);
  await page.getByLabel("От кого открытка", { exact: true }).fill("От автоматической проверки");
  await page.getByLabel("Надпись события", { exact: true }).fill("С днём рождения!");
  await page.getByLabel("Имя организатора", { exact: true }).fill("Smoke Test");
  await page.getByLabel("Email организатора", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Создать открытку", exact: true }).click();

  const result = page.locator("[aria-live='polite']");
  await result.getByText("Черновик готов", { exact: true }).waitFor({ state: "visible" });
  const resultText = await result.innerText();
  const manageUrl = resultText.match(/https?:\/\/[^\s]+\/manage\/[a-z0-9]+/i)?.[0];
  const joinUrl = resultText.match(/https?:\/\/[^\s]+\/join\/[a-z0-9]+/i)?.[0];
  const giftUrl = resultText.match(/https?:\/\/[^\s]+\/gift\/[a-z0-9]+/i)?.[0];
  assert(manageUrl && joinUrl && giftUrl, "Create result did not expose all card routes.");

  const localize = (url) => `${baseUrl}${new URL(url).pathname}`;
  await page.goto(localize(joinUrl), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  createdCardId = await page.locator("input[name='cardId']").inputValue();
  await page.getByPlaceholder("Например, Ольга", { exact: true }).fill("Smoke participant");
  await page
    .getByPlaceholder("Напишите несколько теплых слов: что цените, за что благодарны, какой момент хочется вспомнить...", { exact: true })
    .fill("Желаю радости, вдохновения и прекрасных моментов каждый день!");
  await page.getByRole("button", { name: "Подарить слова", exact: true }).click();
  await page.waitForTimeout(1200);
  const joinResultText = await page.locator("body").innerText();
  assert(
    joinResultText.includes("Поздравление добавлено в открытку."),
    `Contribution was not accepted. Page state: ${joinResultText.slice(0, 1800)}`
  );

  await page.goto(localize(manageUrl), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  assert(await page.getByText("Бумажный классический", { exact: true }).count(), "Default template is not visible.");

  await page.goto(`${localize(manageUrl)}?tab=content`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Загрузить фото", exact: true }).click();
  await page.locator("input[type='file']").setInputFiles({
    name: "smoke.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
  });
  await page.getByRole("button", { name: "Добавить фото", exact: true }).click();
  await page.getByText("Фото сохранено.", { exact: true }).waitFor({ state: "visible" });

  await page.goto(localize(manageUrl), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Опубликовать открытку", exact: true }).click();
  await page.waitForURL(`**/gift/**`);
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
      await database.query("DELETE FROM cards WHERE id = $1", [createdCardId]);
    } finally {
      await database.end();
    }
    await rm(join(process.cwd(), "public", "uploads", "cards", createdCardId), { recursive: true, force: true });
  }
}
