// Quick visual check of the /example scroll animations (docs/plankimi.md).
// Usage: node scripts/capture-example-page.mjs [port]
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const port = process.argv[2] ?? "3105";
const base = `http://localhost:${port}`;
const outDir = "screenshots/example-motion";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());

const shoot = async (name, { width, height, url, scrollSteps = [], reducedMotion = false }) => {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}-top.png` });
  for (const [i, y] of scrollSteps.entries()) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${name}-step${i + 1}.png` });
  }
  // scroll back up: reveals must NOT replay
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${outDir}/${name}-back-top.png` });
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  console.log(`${name}: horizontal overflow = ${overflowX}`);
  await page.close();
};

await shoot("desktop", {
  width: 1440, height: 900, url: "/example",
  scrollSteps: [500, 1100, 1900, 2600]
});

await shoot("desktop-route", {
  width: 1440, height: 900, url: "/example?template=route",
  scrollSteps: [500]
});

await shoot("mobile", {
  width: 390, height: 844, url: "/example",
  scrollSteps: [700, 1500, 2400, 3300]
});

await shoot("desktop-reduced", {
  width: 1440, height: 900, url: "/example",
  scrollSteps: [1100],
  reducedMotion: true
});

await browser.close();
console.log("done");
