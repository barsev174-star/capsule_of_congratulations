import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const chromePath =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

const outDir = resolve("screenshots", "final");
await mkdir(outDir, { recursive: true });

async function capture(viewport, filename) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = window.innerHeight * 0.7;
    const max = document.body.scrollHeight - window.innerHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await delay(350);
    }
    window.scrollTo({ top: max, behavior: "instant" });
    await delay(600);
  });
  await page.screenshot({ path: resolve(outDir, filename), fullPage: true });
  await context.close();
}

await capture({ width: 1440, height: 900 }, "homepage-desktop.png");
await capture({ width: 1024, height: 768 }, "homepage-tablet.png");
await capture({ width: 390, height: 844 }, "homepage-mobile.png");

await browser.close();
console.log("Screenshots saved to", outDir);
