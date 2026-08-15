import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import sharp from "sharp";

const host = "127.0.0.1";
const port = Number(process.env.LEGACY_BASELINE_PORT ?? 3212);
const configuredBaseUrl = process.env.LEGACY_BASELINE_BASE_URL?.replace(/\/$/, "");
const fallbackBaseUrl = `http://${host}:${port}`;
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const outputDir = resolve(projectDir, "screenshots", "template-legacy-baseline");
const templates = ["paper-birthday", "route-adventure"];
const surfaces = ["private", "public"];
const scenarios = ["grid-2", "carousel-1", "carousel-2", "portrait", "landscape-pair", "landscape-trio"];
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};
const primaryScenario = "landscape-trio";
const exportFormats = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
  print: { width: 1240, height: 1754 }
};
const failures = [];
const warnings = [];
const report = [];
const exportReport = [];

await mkdir(outputDir, { recursive: true });

const baselinePath = "/internal/template-baseline?template=paper-birthday&surface=private&scenario=grid-2";
const isBaselineServer = async (candidate) => {
  try {
    const response = await fetch(`${candidate}${baselinePath}`);
    return response.ok;
  } catch {
    return false;
  }
};

let baseUrl = configuredBaseUrl;
if (!baseUrl && await isBaselineServer("http://127.0.0.1:3000")) baseUrl = "http://127.0.0.1:3000";
baseUrl ??= fallbackBaseUrl;

const server = baseUrl !== fallbackBaseUrl ? null : spawn(process.execPath, [nextBin, "dev", "-H", host, "-p", String(port)], {
  cwd: projectDir,
  env: { ...process.env, NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: fallbackBaseUrl },
  stdio: ["ignore", "pipe", "pipe"]
});
let serverOutput = "";
server?.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server?.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

const waitForServer = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await isBaselineServer(baseUrl)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Legacy baseline server did not start. ${serverOutput.slice(-2000)}`);
};

const launchBrowser = async () => {
  if (process.env.CHROME_PATH) {
    return chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  }
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {}
  }
  throw new Error("Chrome or Edge is required for the legacy template baseline.");
};

let browser;
try {
  await waitForServer();
  browser = await launchBrowser();

  for (const template of templates) {
    for (const surface of surfaces) {
      for (const scenario of scenarios) {
        for (const [viewportName, viewport] of Object.entries(viewports)) {
          const context = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
          const page = await context.newPage();
          const browserErrors = [];
          page.on("pageerror", (error) => browserErrors.push(error.message));
          page.on("console", (message) => {
            if (message.type() === "error") browserErrors.push(message.text());
          });

          const query = new URLSearchParams({ template, surface, scenario });
          const response = await page.goto(`${baseUrl}/internal/template-baseline?${query}`, {
            waitUntil: "networkidle",
            timeout: 60_000
          });
          await page.addStyleTag({
            content: "nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"
          });
          await page.evaluate(async () => {
            await document.fonts.ready;
            const images = [...document.images];
            await Promise.all(images.map((image) => image.complete
              ? Promise.resolve()
              : new Promise((resolveImage) => {
                  image.addEventListener("load", resolveImage, { once: true });
                  image.addEventListener("error", resolveImage, { once: true });
                })));
          });

          const metrics = await page.evaluate(() => {
            const root = document.querySelector("[data-template-baseline]");
            const brokenImages = [...document.images]
              .filter((image) => image.complete && image.naturalWidth === 0)
              .map((image) => image.currentSrc || image.src);
            return {
              root: root?.getAttribute("data-template-baseline") ?? null,
              clientWidth: document.documentElement.clientWidth,
              scrollWidth: document.documentElement.scrollWidth,
              scrollHeight: document.documentElement.scrollHeight,
              brokenImages
            };
          });

          const key = `${template}:${surface}:${scenario}:${viewportName}`;
          const caseFailures = [];
          const transientBrowserErrors = browserErrors.filter((message) => message.includes("net::ERR_NO_BUFFER_SPACE"));
          const actionableBrowserErrors = browserErrors.filter((message) => !message.includes("net::ERR_NO_BUFFER_SPACE"));
          if (response?.status() !== 200) caseFailures.push(`HTTP ${response?.status() ?? "unknown"}`);
          if (!metrics.root) caseFailures.push("baseline root is missing");
          if (metrics.scrollWidth > metrics.clientWidth + 1) {
            caseFailures.push(`horizontal overflow ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
          }
          if (metrics.brokenImages.length > 0) caseFailures.push(`${metrics.brokenImages.length} broken images`);
          if (actionableBrowserErrors.length > 0) caseFailures.push(`${actionableBrowserErrors.length} browser errors`);
          if (transientBrowserErrors.length > 0) warnings.push(`${key}: ${transientBrowserErrors.length} transient socket errors`);

          let screenshot = null;
          if (scenario === primaryScenario) {
            const fileName = `${template}-${surface}-${viewportName}.png`;
            const path = resolve(outputDir, fileName);
            await page.screenshot({ path, fullPage: true });
            const digest = createHash("sha256").update(await readFile(path)).digest("hex");
            screenshot = { fileName, sha256: digest };
          }

          if (caseFailures.length > 0) failures.push(`${key}: ${caseFailures.join(", ")}`);
          report.push({ key, ...metrics, browserErrors: actionableBrowserErrors, warnings: transientBrowserErrors, failures: caseFailures, screenshot });
          await context.close();
          await new Promise((done) => setTimeout(done, 75));
        }
      }
    }
  }

  for (const template of templates) {
    for (const [format, expected] of Object.entries(exportFormats)) {
      const token = `__legacy-baseline-${template}__`;
      const response = await fetch(
        `${baseUrl}/share/${encodeURIComponent(token)}/image/${format}?preview=1`
      );
      const buffer = Buffer.from(await response.arrayBuffer());
      const metadata = buffer.length > 0 ? await sharp(buffer).metadata().catch(() => ({})) : {};
      const key = `${template}:${format}`;
      const caseFailures = [];
      if (!response.ok) caseFailures.push(`HTTP ${response.status}`);
      if (response.headers.get("content-type") !== "image/png") {
        caseFailures.push(`unexpected content type ${response.headers.get("content-type") ?? "missing"}`);
      }
      if (metadata.width !== expected.width || metadata.height !== expected.height) {
        caseFailures.push(
          `unexpected dimensions ${metadata.width ?? "?"}x${metadata.height ?? "?"} (expected ${expected.width}x${expected.height})`
        );
      }

      const fileName = `${template}-${format}.png`;
      const path = resolve(outputDir, fileName);
      await writeFile(path, buffer);
      const digest = createHash("sha256").update(buffer).digest("hex");
      if (caseFailures.length > 0) failures.push(`${key}: ${caseFailures.join(", ")}`);
      exportReport.push({ key, fileName, sha256: digest, bytes: buffer.length, ...metadata, failures: caseFailures });
    }
  }

  await writeFile(
    resolve(outputDir, "report.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, primaryScenario, cases: report, exports: exportReport }, null, 2)}\n`,
    "utf8"
  );

  if (failures.length > 0) throw new Error(`Legacy baseline failed:\n${failures.join("\n")}`);
  console.log(`LEGACY_BASELINE_OK ${report.length} web cases, 8 web screenshots, 6 exports, ${warnings.length} transient socket warnings, report=${resolve(outputDir, "report.json")}`);
} finally {
  await browser?.close();
  server?.kill();
}
