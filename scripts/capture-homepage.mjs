import { chromium } from "playwright-core";
import { resolve } from "node:path";

const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

async function capture(viewport, filename) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve("screenshots", filename), fullPage: true });
  await context.close();
}

await capture({ width: 1280, height: 900 }, "homepage-desktop.png");
await capture({ width: 390, height: 844 }, "homepage-mobile.png");

await browser.close();
console.log("Screenshots saved");
