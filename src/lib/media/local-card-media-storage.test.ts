import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CardMediaProcessingError, sanitizeCardMediaBuffer } from "./local-card-media-storage";

describe("server-side card media sanitization", () => {
  it("decodes, rotates and strips metadata from JPEG uploads", async () => {
    const input = await sharp({
      create: { width: 3, height: 2, channels: 3, background: "#e9652f" }
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const result = await sanitizeCardMediaBuffer(input);
    const metadata = await sharp(result.buffer).metadata();

    expect(result.mimeType).toBe("image/jpeg");
    expect({ width: result.width, height: result.height }).toEqual({ width: 2, height: 3 });
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("uses the decoded format instead of trusting a browser MIME value", async () => {
    const input = await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0.5 } }
    }).png().toBuffer();
    const result = await sanitizeCardMediaBuffer(input);
    expect(result.mimeType).toBe("image/png");
    expect(result.buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  });

  it("rejects content that only claims to be an image", async () => {
    await expect(sanitizeCardMediaBuffer(Buffer.from("<script>alert(1)</script>")))
      .rejects.toBeInstanceOf(CardMediaProcessingError);
  });
});
