import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("template export asset route", () => {
  it("converts a public template WebP to a PNG for ImageResponse", async () => {
    const response = await GET(new Request(
      "http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2Fpage.webp"
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format).toBe("png");
  });

  it("returns an exact raster crop for nine-slice and cover rendering", async () => {
    const response = await GET(new Request(
      "http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2Fpage.webp&crop=480,0,576,1024"
    ));
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();

    expect(response.status).toBe(200);
    expect(metadata).toMatchObject({ format: "png", width: 576, height: 1024 });
  });

  it.each([
    ["section-memories.webp", "nine%3A0.08%2C0.05%2C0.08%2C0.05"],
    ["section-closing-finale-desktop-v3.webp", "horizontal%3A0.1"]
  ])("precomposes %s slices into an ImageResponse-safe PNG", async (asset, slices) => {
    const response = await GET(new Request(
      `http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2F${asset}&width=320&height=180&slices=${slices}`
    ));
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();

    expect(response.status).toBe(200);
    expect(metadata).toMatchObject({ format: "png", width: 320, height: 180 });
  });

  it("rejects a crop outside the source asset", async () => {
    const response = await GET(new Request(
      "http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Fschool-scrapbook%2Fpage.webp&crop=1500,0,576,1024"
    ));

    expect(response.status).toBe(400);
  });

  it("does not expose files outside the public template directory", async () => {
    const response = await GET(new Request(
      "http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2F..%2F..%2F.env.local"
    ));

    expect(response.status).toBe(404);
  });
});
