import { describe, expect, it } from "vitest";
import {
  CARD_IMAGE_UPLOAD_MAX_BYTES,
  isHeicImageFile,
  isSupportedImageSource,
  prepareImageFileForUpload,
  shouldOptimizeImageFile
} from "./image-compression";

describe("client image preparation", () => {
  it("recognizes phone photo formats including HEIC and HEIF", () => {
    expect(isSupportedImageSource({ name: "photo.HEIC", type: "" })).toBe(true);
    expect(isHeicImageFile({ name: "photo.heif", type: "application/octet-stream" })).toBe(true);
    expect(isSupportedImageSource({ name: "animation.gif", type: "image/gif" })).toBe(false);
  });

  it("optimizes sources above the protected server limit", () => {
    expect(shouldOptimizeImageFile({ name: "large.jpg", type: "image/jpeg", size: CARD_IMAGE_UPLOAD_MAX_BYTES + 1 })).toBe(true);
    expect(shouldOptimizeImageFile({ name: "ready.webp", type: "image/webp", size: CARD_IMAGE_UPLOAD_MAX_BYTES })).toBe(false);
  });

  it("keeps a supported small image unchanged", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "ready.jpg", { type: "image/jpeg" });
    const progress: number[] = [];
    const result = await prepareImageFileForUpload(file, { onProgress: (value) => progress.push(value) });

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(progress).toEqual([1]);
  });
});
