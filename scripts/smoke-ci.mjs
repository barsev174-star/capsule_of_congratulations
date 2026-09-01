import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, devices, firefox, webkit } from "playwright-core";

const port = Number.parseInt(process.env.CI_SMOKE_PORT ?? "3100", 10);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(process.cwd(), "artifacts", "ci-smoke");
const browserNames = (process.env.SMOKE_BROWSERS ?? "chromium,firefox,webkit")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const browserTypes = { chromium, firefox, webkit };
const routes = ["/", "/example", "/manage/new", "/privacy"];

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const waitUntilReady = async () => {
  const deadline = Date.now() + 60_000;
  let lastError = "server did not respond";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      lastError = `health returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next.js did not become ready: ${lastError}`);
};

const nextProcess = spawn(
  process.execPath,
  [join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
  { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] }
);
let serverLog = "";
for (const stream of [nextProcess.stdout, nextProcess.stderr]) {
  stream.on("data", (chunk) => {
    serverLog = `${serverLog}${chunk}`.slice(-12_000);
  });
}

try {
  await mkdir(outputDir, { recursive: true });
  await waitUntilReady();

  const headerResponse = await fetch(baseUrl);
  for (const name of [
    "content-security-policy",
    "permissions-policy",
    "referrer-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options"
  ]) {
    assert(headerResponse.headers.has(name), `home: missing ${name}`);
  }

  const roadmapResponse = await fetch(`${baseUrl}/roadmap`, { redirect: "manual" });
  assert([301, 308].includes(roadmapResponse.status), `roadmap: expected permanent redirect, got ${roadmapResponse.status}`);
  assert(roadmapResponse.headers.get("location") === "/", "roadmap: expected redirect to /");

  const robotsResponse = await fetch(`${baseUrl}/robots.txt`);
  assert(robotsResponse.ok, `robots: HTTP ${robotsResponse.status}`);
  assert((await robotsResponse.text()).includes("Disallow: /roadmap"), "robots: roadmap must be disallowed");

  for (const browserName of browserNames) {
    const browserType = browserTypes[browserName];
    assert(browserType, `Unsupported browser: ${browserName}`);
    const launchOptions = browserName === "chromium" && process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {};
    const browser = await browserType.launch({ headless: true, ...launchOptions });
    try {
      for (const profile of [
        { name: "desktop", options: { viewport: { width: 1440, height: 1000 } } },
        { name: "mobile", options: { ...devices["iPhone 14"], viewport: { width: 390, height: 844 } } }
      ]) {
        const context = await browser.newContext(profile.options);
        try {
          for (const route of routes) {
            const page = await context.newPage();
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            page.on("console", (message) => {
              if (message.type() === "error") errors.push(message.text());
            });
            const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
            assert(response?.status() === 200, `${browserName}/${profile.name}${route}: HTTP ${response?.status()}`);
            assert(await page.locator("main").count() >= 1, `${browserName}/${profile.name}${route}: main is missing`);
            assert(await page.locator("h1").count() === 1, `${browserName}/${profile.name}${route}: expected one h1`);
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert(overflow <= 1, `${browserName}/${profile.name}${route}: horizontal overflow ${overflow}px`);
            assert(errors.length === 0, `${browserName}/${profile.name}${route}: ${errors.join("; ")}`);

            if (route === "/" || route === "/example") {
              await page.evaluate(async () => {
                const step = Math.max(320, Math.floor(window.innerHeight * 0.8));
                for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
                  window.scrollTo({ top, behavior: "instant" });
                  await new Promise((resolve) => setTimeout(resolve, 35));
                }
                window.scrollTo({ top: 0, behavior: "instant" });
              });
              await page.waitForTimeout(1_000);
              const name = route === "/" ? "home" : "example";
              await page.screenshot({
                path: join(outputDir, `${browserName}-${profile.name}-${name}.png`),
                fullPage: true
              });
            }
            await page.close();
          }
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }

  console.log(`CI browser smoke passed: ${browserNames.join(", ")}; screenshots: ${outputDir}`);
} catch (error) {
  console.error(serverLog);
  throw error;
} finally {
  nextProcess.kill("SIGTERM");
}
