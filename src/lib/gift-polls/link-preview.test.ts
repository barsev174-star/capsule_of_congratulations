import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanProductUrl, extractProductUrl, previewGiftLink, productImageUrl } from "./link-preview";

describe("extractProductUrl", () => {
  it("finds and cleans a URL in copied text", () => expect(extractProductUrl("Товар: https://www.ozon.ru/product/item-1)." )).toBe("https://www.ozon.ru/product/item-1"));
  it("uses the first supported URL", () => expect(extractProductUrl("https://one.example/a и https://two.example/b")).toBe("https://one.example/a"));
  it("does not treat descriptive text as a URL", () => expect(extractProductUrl("Подарок без магазина")).toBeNull());
  it("does not accept non-http schemes", () => expect(extractProductUrl("file:///etc/passwd ftp://x.ru/a")).toBeNull());
});

describe("cleanProductUrl", () => {
  it("drops tracking parameters and the fragment, keeping the path and product params", () => {
    expect(cleanProductUrl("https://example.com/catalog/item?id=42&utm_source=email&yclid=123&gclid=9&fbclid=7#reviews"))
      .toBe("https://example.com/catalog/item?id=42");
  });
  it("drops accidentally pasted personal and session parameters", () => {
    expect(cleanProductUrl("https://example.com/p/1?sku=42&email=user%40example.com&session_id=secret&access_token=token"))
      .toBe("https://example.com/p/1?sku=42");
  });
  it("keeps a clean URL unchanged", () => {
    expect(cleanProductUrl("https://example.com/p/1")).toBe("https://example.com/p/1");
  });
  it("rejects non-http URLs", () => {
    expect(cleanProductUrl("file:///etc/passwd")).toBeNull();
    expect(cleanProductUrl("не ссылка")).toBeNull();
  });
});

describe("productImageUrl", () => {
  const base = "https://example.com/p/1";
  it("accepts a product image and resolves relative paths", () => {
    expect(productImageUrl("https://cdn.example.com/images/p1.jpg", base)).toBe("https://cdn.example.com/images/p1.jpg");
    expect(productImageUrl("/images/p1.webp", base)).toBe("https://example.com/images/p1.webp");
  });
  it("rejects favicons, logos, icons and svg", () => {
    expect(productImageUrl("https://example.com/favicon.ico", base)).toBeNull();
    expect(productImageUrl("https://example.com/assets/logo.png", base)).toBeNull();
    expect(productImageUrl("https://example.com/assets/icon-cart.png", base)).toBeNull();
    expect(productImageUrl("https://example.com/img/photo.svg", base)).toBeNull();
  });
  it("rejects tracking pixels and tiny images", () => {
    expect(productImageUrl("https://example.com/track/pixel.gif", base)).toBeNull();
    expect(productImageUrl("https://example.com/img/photo_32x32.jpg", base)).toBeNull();
    expect(productImageUrl("https://example.com/img/p.jpg?w=20&h=20", base)).toBeNull();
  });
  it("rejects non-http and missing values", () => {
    expect(productImageUrl("data:image/png;base64,AAAA", base)).toBeNull();
    expect(productImageUrl(null, base)).toBeNull();
  });
});

const htmlResponse = (html: string, status = 200) => new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });

const productPage = (overrides = "") => `<!doctype html><html><head>
  <title>Лодка ПВХ Аква 2900 купить в Челябинске | Центр Лодок</title>
  <meta property="og:title" content="Лодка ПВХ Аква 2900 слань-киль книжка зеленый купить в Челябинске — Центр Лодок" />
  <meta property="og:image" content="https://cdn.example.com/products/akva-2900.jpg" />
  <meta property="og:description" content="Надувная лодка ПВХ с килем. Надувная лодка ПВХ с килем." />
  <script type="application/ld+json">{"@type":"Product","name":"Лодка ПВХ Аква 2900 слань-киль","image":"https://cdn.example.com/products/akva-2900.jpg","offers":{"price":40050,"priceCurrency":"RUB"}}</script>
  ${overrides}
</head><body></body></html>`;

describe("previewGiftLink", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a cleaned draft without creating anything", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(productPage()));
    vi.stubGlobal("fetch", fetchMock);
    const preview = await previewGiftLink("https://example.com/catalog/lodki/akva-2900/?utm_source=x#y");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe("https://example.com/catalog/lodki/akva-2900/");
    expect(preview.metadata.title).toBe("Лодка ПВХ Аква 2900 слань-киль");
    expect(preview.metadata.price).toEqual({ amount: 40050, currency: "RUB" });
    expect(preview.metadata.imageUrl).toBe("https://cdn.example.com/products/akva-2900.jpg");
    expect(preview.metadata.description).toBe("Надувная лодка ПВХ с килем");
    expect(preview.extractedUrl).toBe("https://example.com/catalog/lodki/akva-2900/");
    expect(preview.warnings).toEqual([]);
  });

  it("rejects a price without a reliably detected currency", async () => {
    const html = productPage().replace('"priceCurrency":"RUB"', "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(preview.metadata.price).toBeNull();
    expect(preview.warnings).toContain("PRICE_UNAVAILABLE");
  });

  it("rejects an unusable image candidate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(productPage().replaceAll("https://cdn.example.com/products/akva-2900.jpg", "https://example.com/assets/logo.png"))));
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(preview.metadata.imageUrl).toBeNull();
    expect(preview.warnings).toContain("IMAGE_UNAVAILABLE");
  });

  it.each([
    ["file URL", "file:///etc/passwd"],
    ["localhost", "http://localhost:3000/admin"],
    ["loopback", "http://127.0.0.1/admin"],
    ["private IPv4", "http://192.168.1.10/"],
    ["link-local metadata endpoint", "http://169.254.169.254/latest/meta-data"],
    ["IPv6 loopback", "http://[::1]/"]
  ])("never fetches %s", async (_label, input) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const preview = await previewGiftLink(input);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(preview.metadata.title).toBeNull();
  });

  it("stops when a redirect targets a private address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: "http://10.0.0.5/internal" } }));
    vi.stubGlobal("fetch", fetchMock);
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(preview.warnings).toContain("PAGE_UNAVAILABLE");
  });

  it("gives up after the redirect limit", async () => {
    let call = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      call += 1;
      return Promise.resolve(new Response(null, { status: 302, headers: { location: `https://example.com/next-${call}` } }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(preview.warnings).toContain("PAGE_UNAVAILABLE");
  });

  it("rejects responses over the size limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("x", { status: 200, headers: { "content-type": "text/html", "content-length": "900000" } }));
    vi.stubGlobal("fetch", fetchMock);
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(preview.metadata.title).toBeNull();
    expect(preview.warnings).toContain("PAGE_UNAVAILABLE");
  });

  it("rejects non-HTML responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json" } })));
    const preview = await previewGiftLink("https://example.com/p/1");
    expect(preview.warnings).toContain("PAGE_UNAVAILABLE");
  });

  it("falls back to a safe partial result on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("TimeoutError")));
    const preview = await previewGiftLink("Лодка Аква, https://example.com/p/1");
    expect(preview.extractedUrl).toBe("https://example.com/p/1");
    expect(preview.metadata.title).toBe("Лодка Аква");
    expect(preview.warnings).toContain("PAGE_UNAVAILABLE");
  });

  it("returns URL_NOT_FOUND when there is no URL at all", async () => {
    const preview = await previewGiftLink("Просто текст без ссылки");
    expect(preview.warnings).toEqual(["URL_NOT_FOUND"]);
    expect(preview.extractedUrl).toBe("");
  });
});
