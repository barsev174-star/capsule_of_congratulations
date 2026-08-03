import { chromium, devices } from "playwright-core";
import { mkdir } from "node:fs/promises";

const out = "screenshots/gift-redesign";
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

// 1. Mobile full page (open poll, no votes)
{
  const context = await browser.newContext({ ...devices["iPhone 14"], viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/manage/8e763a8a46f8ba7e6717fecfa0e329ac?tab=gift", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/mobile-full.png`, fullPage: true });
  await context.close();
}

// 2. Locked state (open poll with votes)
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/manage/b9e7d3228f88df544f98fb631960b616?tab=gift", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/desktop-locked.png`, fullPage: true });
  const menuButtons = page.locator("article [aria-haspopup='menu']");
  if (await menuButtons.count()) {
    await menuButtons.first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/desktop-locked-menu.png` });
    await page.keyboard.press("Escape");
  }
  await context.close();
}

// 3. Draft state + open-poll dialog
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log("[pageerror:draft]", error.message));
  await page.goto("http://localhost:3000/manage/06fd07d5c06763c2edfb42286148c79d?tab=gift", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/desktop-draft.png`, fullPage: true });
  const openButton = page.getByRole("button", { name: "Открыть голосование" });
  if (await openButton.count()) {
    await openButton.first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/desktop-open-dialog.png` });
  } else {
    console.log("open button not found (poll not ready?)");
  }
  await context.close();
}

await browser.close();
console.log("done");
