import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { preparePublicSharePhotoResponse, sanitizePublicSharePhoto } from "./media-storage";

const image = () => sharp({
  create: {
    width: 4,
    height: 3,
    channels: 4,
    background: { r: 233, g: 101, b: 47, alpha: 0.7 }
  }
});

describe("sanitizePublicSharePhoto", () => {
  it("normalizes EXIF orientation for universal derivatives and removes the orientation tag", async () => {
    const source = await sharp({
      create: { width: 3, height: 2, channels: 3, background: "#ffffff" }
    }).withMetadata({ orientation: 6 }).jpeg().toBuffer();

    const sanitized = await sanitizePublicSharePhoto(source, "image/jpeg", true);
    const metadata = await sharp(sanitized).metadata();

    expect(metadata.width).toBe(2);
    expect(metadata.height).toBe(3);
    expect(metadata.orientation).toBeUndefined();
  });
});

describe("preparePublicSharePhotoResponse", () => {
  it("keeps WebP unchanged for the public card", async () => {
    const webp = await image().webp().toBuffer();

    const result = await preparePublicSharePhotoResponse({
      file: webp,
      fileName: "photo.webp",
      exportCompatible: false
    });

    expect(result.contentType).toBe("image/webp");
    expect(result.file).toEqual(webp);
  });

  it("converts WebP to PNG for server-side exports", async () => {
    const webp = await image().webp().toBuffer();

    const result = await preparePublicSharePhotoResponse({
      file: webp,
      fileName: "photo.webp",
      exportCompatible: true
    });

    expect(result.contentType).toBe("image/png");
    expect((await sharp(result.file).metadata()).format).toBe("png");
  });

  it("does not re-encode an already compatible JPEG", async () => {
    const jpeg = await image().jpeg().toBuffer();

    const result = await preparePublicSharePhotoResponse({
      file: jpeg,
      fileName: "photo.jpg",
      exportCompatible: true
    });

    expect(result.contentType).toBe("image/jpeg");
    expect(result.file).toEqual(jpeg);
  });
});
