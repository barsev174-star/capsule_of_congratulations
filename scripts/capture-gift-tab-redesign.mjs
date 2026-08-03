import { chromium, devices } from "playwright-core";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3000/manage/8e763a8a46f8ba7e6717fecfa0e329ac?tab=gift";
const out = "screenshots/gift-redesign";
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

const targets = [
  { name: "desktop", options: { viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 } },
  { name: "mobile", options: { ...devices["iPhone 14"], viewport: { width: 390, height: 844 } } }
];

for (const target of targets) {
  const context = await browser.newContext(target.options);
  const page = await context.newPage();
  page.on("pageerror", (error) => console.log(`[pageerror:${target.name}]`, error.message));
  await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `${out}/${target.name}-tab.png`, fullPage: target.name === "desktop" });
  if (target.name === "desktop") {
    // Option menu
    const menuButtons = page.locator("article [aria-haspopup='menu']");
    if (await menuButtons.count()) {
      await menuButtons.first().click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/desktop-option-menu.png` });
      await page.keyboard.press("Escape");
    }
    // Add option modal
    const addButton = page.getByRole("button", { name: /Добавить (вариант|сумму)/ });
    if (await addButton.count()) {
      await addButton.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/desktop-add-modal.png` });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    // Settings modal
    const settingsButton = page.getByRole("button", { name: "Изменить настройки голосования" });
    if (await settingsButton.count()) {
      await settingsButton.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/desktop-settings-modal.png` });
      await page.keyboard.press("Escape");
    }
  }
  await context.close();
}

await browser.close();
console.log("done");
