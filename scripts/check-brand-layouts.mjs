import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const port = 3123;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = resolve("screenshots", "brand-check");
const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  cwd: process.cwd(),
  stdio: "pipe"
});

const waitForServer = async () => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error("Brand check server did not start");
};

const report = [];

try {
  await waitForServer();
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });

  for (const [route, selector] of [["home", "header a"], ["example", "header a"]]) {
    for (const [name, baseViewport] of Object.entries({ desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } })) {
      for (const zoom of [80, 100, 125, 150]) {
        const viewport = { ...baseViewport, width: Math.round(baseViewport.width / (zoom / 100)) };
        const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(route === "home" ? baseUrl : `${baseUrl}/example`, { waitUntil: "networkidle" });

        const result = await page.locator(selector).first().evaluate((element) => {
          const box = element.getBoundingClientRect();
          const header = element.closest("header");
          return {
            width: Math.round(box.width),
            height: Math.round(box.height),
            headerWidth: header?.clientWidth ?? 0,
            headerScrollWidth: header?.scrollWidth ?? 0,
            overflow: Boolean(header && header.scrollWidth > window.innerWidth)
          };
        });
        report.push({ route, name, zoom, viewportWidth: viewport.width, ...result });
        await page.screenshot({ path: resolve(outputDir, `${route}-${name}-${zoom}.png`), fullPage: false });
        await context.close();
      }
    }
  }

  await browser.close();
  await writeFile(resolve(outputDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.some((entry) => entry.overflow)) process.exitCode = 1;
} finally {
  next.kill("SIGTERM");
}
