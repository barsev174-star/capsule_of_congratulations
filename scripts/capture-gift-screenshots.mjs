import { chromium, devices } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const url = process.argv[2] ?? "http://localhost:3000/gift/65a37b2a9bcd?debugAssets=1";
const outputDir = resolve("screenshots");
const chromePath =
  process.env.CHROME_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const viewports = [
  {
    name: "desktop",
    options: {
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
      isMobile: false
    }
  },
  {
    name: "mobile",
    options: {
      ...devices["iPhone 14"],
      viewport: { width: 390, height: 844 }
    }
  }
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true
});

const report = {
  url,
  createdAt: new Date().toISOString(),
  screenshots: [],
  console: [],
  pageErrors: []
};

try {
  for (const target of viewports) {
    const context = await browser.newContext(target.options);
    const page = await context.newPage();

    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        report.console.push({
          viewport: target.name,
          type: message.type(),
          text: message.text()
        });
      }
    });

    page.on("pageerror", (error) => {
      report.pageErrors.push({
        viewport: target.name,
        message: error.message
      });
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const filePath = resolve(outputDir, `gift-${target.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });

    report.screenshots.push({
      viewport: target.name,
      path: filePath,
      title: await page.title(),
      bodyTextStart: (await page.locator("body").innerText({ timeout: 5000 })).slice(0, 500)
    });

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(resolve(outputDir, "gift-report.json"), JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify(report, null, 2));
