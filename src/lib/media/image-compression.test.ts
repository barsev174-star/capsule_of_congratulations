import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CARD_IMAGE_MAX_DIMENSION,
  CARD_IMAGE_UPLOAD_TARGET_BYTES,
  isHeicImageFile,
  isSupportedImageSource,
  prepareImageFileForUpload,
  shouldOptimizeImageFile
} from "./image-compression";

describe("client image preparation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("recognizes phone photo formats including HEIC and HEIF", () => {
    expect(isSupportedImageSource({ name: "photo.HEIC", type: "" })).toBe(true);
    expect(isHeicImageFile({ name: "photo.heif", type: "application/octet-stream" })).toBe(true);
    expect(isSupportedImageSource({ name: "animation.gif", type: "image/gif" })).toBe(false);
  });

  it("optimizes sources above the transfer target or the dimension limit", () => {
    expect(shouldOptimizeImageFile({ name: "large.jpg", type: "image/jpeg", size: CARD_IMAGE_UPLOAD_TARGET_BYTES + 1 })).toBe(true);
    expect(shouldOptimizeImageFile(
      { name: "wide.webp", type: "image/webp", size: CARD_IMAGE_UPLOAD_TARGET_BYTES },
      { width: CARD_IMAGE_MAX_DIMENSION + 1, height: 1200 }
    )).toBe(true);
    expect(shouldOptimizeImageFile(
      { name: "ready.webp", type: "image/webp", size: CARD_IMAGE_UPLOAD_TARGET_BYTES },
      { width: CARD_IMAGE_MAX_DIMENSION, height: CARD_IMAGE_MAX_DIMENSION }
    )).toBe(false);
  });

  it("keeps a supported small image unchanged", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }));
    const file = new File([new Uint8Array([1, 2, 3])], "ready.jpg", { type: "image/jpeg" });
    const progress: number[] = [];
    const result = await prepareImageFileForUpload(file, { onProgress: (value) => progress.push(value) });

    expect(result.file).toBe(file);
    expect(result.optimized).toBe(false);
    expect(progress).toEqual([1]);
  });
});
