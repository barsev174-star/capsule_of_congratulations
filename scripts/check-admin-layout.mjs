import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.ADMIN_QA_URL || "http://127.0.0.1:3211";
if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) throw new Error("This check only supports a local test server.");
const secret = process.env.ADMIN_QA_SESSION_SECRET;
if (!secret) throw new Error("Set ADMIN_QA_SESSION_SECRET to the session secret of the isolated test server.");
const routes = (process.env.ADMIN_QA_ROUTES || "/admin,/admin/cards").split(",");
const outputDir = `output/admin-redesign/${process.env.ADMIN_QA_STAGE || "layout"}`;
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  const payload = Buffer.from(JSON.stringify({ email: "admin-qa@example.com", role: "admin", exp: Date.now() + 3600000 })).toString("base64url");
  const token = `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
  await page.context().addCookies([{ name: "admin_session", value: token, url: baseUrl }]);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const width of [1440, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`${route}: HTTP ${response?.status()}`);
      await page.locator("#admin-content").waitFor();
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${route}: page overflow at ${width}px`);
      if (width <= 768) {
        const menu = page.getByRole("button", { name: "Открыть меню", exact: true });
        await menu.click();
        await page.getByRole("link", { name: "Открытки", exact: true }).first().waitFor({ state: "visible" });
        await page.keyboard.press("Escape");
        await page.getByRole("dialog", { name: "Разделы админки", exact: true }).waitFor({ state: "hidden" });
      }
      await page.screenshot({ path: `${outputDir}/${route.replaceAll(/[^a-z0-9]/gi, "-")}-${width}.png`, fullPage: true });
      console.log(`OK ${route} ${width}px`);
    }
  }
  if (errors.length) throw new Error([...new Set(errors)].join("\n"));
  console.log(`ADMIN_LAYOUT_OK screenshots=${outputDir}`);
} finally { await browser.close(); }
