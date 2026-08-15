import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { loadTemplateManifests } from "./template-pipeline-lib.mjs";

const host = "127.0.0.1";
const port = Number(process.env.UNIVERSAL_BASELINE_PORT ?? 3213);
const configuredBaseUrl = process.env.UNIVERSAL_BASELINE_BASE_URL?.replace(/\/$/, "");
const fallbackBaseUrl = `http://${host}:${port}`;
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const outputDir = resolve(projectDir, "screenshots", "template-universal-baseline");
const templates = (await loadTemplateManifests(projectDir)).map(({ value }) => value.templateId);
const surfaces = ["private", "public"];
const scenarios = ["grid-2", "carousel-1", "carousel-2", "portrait", "landscape-pair", "landscape-trio"];
const viewports = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};
const primaryScenario = "landscape-trio";
const failures = [];
const warnings = [];
const report = [];

if (templates.length === 0) {
  console.log("UNIVERSAL_BASELINE_SKIPPED 0 templates");
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });
const baselinePath = `/internal/template-baseline?template=${templates[0]}&surface=private&scenario=grid-2`;
const isBaselineServer = async (candidate) => {
  try {
    const response = await fetch(`${candidate}${baselinePath}`, { signal: AbortSignal.timeout(3_000) });
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
  throw new Error(`Universal baseline server did not start. ${serverOutput.slice(-2000)}`);
};

const launchBrowser = async () => {
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
  for (const channel of ["chrome", "msedge"]) {
    try { return await chromium.launch({ channel, headless: true }); } catch {}
  }
  throw new Error("Chrome or Edge is required for the universal template baseline.");
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
          page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });

          const query = new URLSearchParams({ template, surface, scenario });
          const response = await page.goto(`${baseUrl}/internal/template-baseline?${query}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
          await page.addStyleTag({ content: "nextjs-portal{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
          await page.evaluate(async () => {
            await document.fonts.ready;
            for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(window.innerHeight * .8, 320)) {
              window.scrollTo(0, y);
              await new Promise((done) => setTimeout(done, 35));
            }
            window.scrollTo(0, 0);
            const pendingImages = Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((done) => {
              image.addEventListener("load", done, { once: true });
              image.addEventListener("error", done, { once: true });
            })));
            await Promise.race([pendingImages, new Promise((done) => setTimeout(done, 3_000))]);
          });

          const metrics = await page.evaluate(() => ({
            root: document.querySelector("[data-template-baseline]")?.getAttribute("data-template-baseline") ?? null,
            family: document.querySelector("[data-template-family]")?.getAttribute("data-template-family") ?? null,
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src)
          }));

          const key = `${template}:${surface}:${scenario}:${viewportName}`;
          const caseFailures = [];
          const transientBrowserErrors = browserErrors.filter((message) => message.includes("net::ERR_NO_BUFFER_SPACE"));
          const actionableBrowserErrors = browserErrors.filter((message) => !message.includes("net::ERR_NO_BUFFER_SPACE"));
          if (response?.status() !== 200) caseFailures.push(`HTTP ${response?.status() ?? "unknown"}`);
          if (!metrics.root) caseFailures.push("baseline root is missing");
          if (metrics.family !== "universal-v1") caseFailures.push(`unexpected family ${metrics.family ?? "missing"}`);
          if (metrics.scrollWidth > metrics.clientWidth + 1) caseFailures.push(`horizontal overflow ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
          if (metrics.brokenImages.length > 0) caseFailures.push(`${metrics.brokenImages.length} broken images`);
          if (actionableBrowserErrors.length > 0) caseFailures.push(`${actionableBrowserErrors.length} browser errors`);
          if (transientBrowserErrors.length > 0) warnings.push(`${key}: ${transientBrowserErrors.length} transient socket errors`);

          let screenshot = null;
          if (scenario === primaryScenario) {
            const fileName = `${template}-${surface}-${viewportName}.png`;
            const path = resolve(outputDir, fileName);
            await page.screenshot({ path, fullPage: true });
            screenshot = { fileName, sha256: createHash("sha256").update(await readFile(path)).digest("hex") };
          }

          if (caseFailures.length > 0) failures.push(`${key}: ${caseFailures.join(", ")}`);
          report.push({ key, ...metrics, browserErrors: actionableBrowserErrors, warnings: transientBrowserErrors, failures: caseFailures, screenshot });
          await context.close();
          // Give Chromium/Next HMR sockets time to leave TIME_WAIT before the next isolated case.
          await new Promise((done) => setTimeout(done, 75));
        }
      }
    }
  }

  await writeFile(resolve(outputDir, "report.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, primaryScenario, cases: report }, null, 2)}\n`, "utf8");
  if (failures.length > 0) throw new Error(`Universal baseline failed:\n${failures.join("\n")}`);
  console.log(`UNIVERSAL_BASELINE_OK ${report.length} web cases, ${templates.length * 4} screenshots, ${warnings.length} transient socket warnings, report=${resolve(outputDir, "report.json")}`);
} finally {
  await browser?.close();
  server?.kill();
}
