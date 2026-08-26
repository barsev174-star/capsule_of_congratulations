import { JSDOM } from "jsdom";

const baseUrl = (process.env.SEO_BASE_URL ?? "https://slovesto.ru").replace(/\/$/, "");
const landingPaths = [
  "/gruppovaya-otkrytka/uchitelyu",
  "/gruppovaya-otkrytka/vospitatelyu",
  "/gruppovaya-otkrytka/kollege",
  "/gruppovaya-otkrytka/den-rozhdeniya"
];

const failures = [];
const imageChecks = new Map();

const fetchChecked = async (url, init = {}) => {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "Slovesto SEO indexing monitor/1.0", ...(init.headers ?? {}) },
    ...init
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response;
};

const readJsonLdTypes = (document) => {
  const types = new Set();
  for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const values = Array.isArray(JSON.parse(node.textContent || "null"))
        ? JSON.parse(node.textContent || "null")
        : [JSON.parse(node.textContent || "null")];
      for (const value of values) {
        const graph = value?.["@graph"] ?? [value];
        for (const item of Array.isArray(graph) ? graph : [graph]) {
          const type = item?.["@type"];
          for (const entry of Array.isArray(type) ? type : [type]) if (entry) types.add(entry);
        }
      }
    } catch {
      types.add("INVALID_JSON_LD");
    }
  }
  return types;
};

const checkImage = async (url) => {
  if (!imageChecks.has(url)) {
    imageChecks.set(url, (async () => {
      const response = await fetchChecked(url);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) throw new Error(`неверный Content-Type: ${contentType || "пусто"}`);
      await response.body?.cancel();
    })());
  }
  return imageChecks.get(url);
};

const rows = [];

for (const path of landingPaths) {
  const expectedUrl = `${baseUrl}${path}`;
  const errors = [];
  try {
    const response = await fetchChecked(expectedUrl);
    const html = await response.text();
    const document = new JSDOM(html).window.document;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content")?.toLowerCase() ?? "";
    const ogImageRaw = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const ogImage = ogImageRaw ? new URL(ogImageRaw, expectedUrl).toString() : null;
    const jsonLdTypes = readJsonLdTypes(document);

    if (!document.title.trim()) errors.push("нет title");
    if (canonical !== expectedUrl) errors.push(`canonical=${canonical ?? "нет"}`);
    if (robots.includes("noindex")) errors.push("noindex");
    if (document.querySelectorAll("h1").length !== 1) errors.push(`H1=${document.querySelectorAll("h1").length}`);
    if (!jsonLdTypes.has("BreadcrumbList")) errors.push("нет BreadcrumbList");
    if (!jsonLdTypes.has("FAQPage")) errors.push("нет FAQPage");
    if (jsonLdTypes.has("INVALID_JSON_LD")) errors.push("невалидный JSON-LD");
    if (!ogImage) errors.push("нет og:image");
    else {
      try { await checkImage(ogImage); } catch (error) { errors.push(`og:image ${error.message}`); }
    }
  } catch (error) {
    errors.push(error.message);
  }
  rows.push({ page: path.split("/").at(-1), status: errors.length ? "FAIL" : "OK", details: errors.join("; ") || "индексируема" });
  if (errors.length) failures.push(`${path}: ${errors.join("; ")}`);
}

try {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const sitemap = await (await fetchChecked(sitemapUrl)).text();
  for (const path of landingPaths) if (!sitemap.includes(`<loc>${baseUrl}${path}</loc>`)) failures.push(`sitemap: нет ${path}`);
  const robots = await (await fetchChecked(`${baseUrl}/robots.txt`)).text();
  if (!robots.includes(`Sitemap: ${sitemapUrl}`)) failures.push("robots.txt: нет production Sitemap");
  if (/Disallow:\s*\/gruppovaya-otkrytka/i.test(robots)) failures.push("robots.txt: SEO-раздел закрыт");
} catch (error) {
  failures.push(`robots/sitemap: ${error.message}`);
}

console.table(rows);
if (failures.length) {
  console.error("\nОшибки контроля индексации:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("\nКонтроль индексации: 4/4 страниц, robots.txt, sitemap.xml и OG — OK.");
}
