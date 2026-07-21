/* Временный скрипт финальной проверки: горизонтальный скролл и видимость контента
   на ширинах 360–1440 + эмуляция prefers-reduced-motion. */
import { chromium } from "playwright-core";

const BASE = process.env.CHECK_URL || "http://localhost:3100";
const widths = [360, 390, 430, 768, 1024, 1440];

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* пробуем следующий канал */
    }
  }
  throw new Error("Не найден ни Edge, ни Chrome для playwright-core");
}

const browser = await launch();
let failed = false;

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const result = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const overflowX = el.scrollWidth - el.clientWidth;
    // Ищем элементы, реально вылезающие за правый край
    const offenders = [];
    if (overflowX > 1) {
      for (const node of document.querySelectorAll("body *")) {
        const rect = node.getBoundingClientRect();
        if (rect.right > el.clientWidth + 1 && rect.width > 4) {
          const cls = typeof node.className === "string" ? node.className : "";
          offenders.push(`${node.tagName.toLowerCase()}.${cls.split(" ").slice(0, 2).join(".")} right=${Math.round(rect.right)}`);
          if (offenders.length >= 5) break;
        }
      }
    }
    return { overflowX, offenders };
  });
  const status = result.overflowX <= 1 ? "OK" : "OVERFLOW";
  if (result.overflowX > 1) failed = true;
  console.log(`[${status}] ${width}px: overflowX=${result.overflowX}px`);
  for (const o of result.offenders) console.log(`    └ ${o}`);
  await page.close();
}

// Reduced motion: контент должен быть виден без анимаций
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const rm = await page.evaluate(() => {
  const heroTitle = document.querySelector("h1");
  const opacity = heroTitle ? Number(getComputedStyle(heroTitle).opacity) : 0;
  const el = document.scrollingElement || document.documentElement;
  const overflowX = el.scrollWidth - el.clientWidth;
  const offenders = [];
  if (overflowX > 1) {
    for (const node of document.querySelectorAll("body *")) {
      const rect = node.getBoundingClientRect();
      if ((rect.right > el.clientWidth + 1 || rect.left < -1) && rect.width > 4) {
        const cls = typeof node.className === "string" ? node.className : "";
        offenders.push(`${node.tagName.toLowerCase()}.${cls.split(" ").slice(0, 2).join(".")} left=${Math.round(rect.left)} right=${Math.round(rect.right)}`);
        if (offenders.length >= 6) break;
      }
    }
  }
  return { heroOpacity: opacity, overflowX, offenders };
});
const rmOk = rm.heroOpacity > 0.95 && rm.overflowX <= 1;
if (!rmOk) failed = true;
console.log(`[${rmOk ? "OK" : "FAIL"}] reduced-motion 390px: heroOpacity=${rm.heroOpacity}, overflowX=${rm.overflowX}px`);
for (const o of rm.offenders) console.log(`    └ ${o}`);
await page.close();

await browser.close();
process.exit(failed ? 1 : 0);
