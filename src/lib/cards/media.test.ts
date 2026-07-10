import {
  CARD_MEDIA_MAX_COUNT,
  CARD_MEDIA_MAX_BYTES,
  buildCardMediaFileName,
  isSupportedCardMediaMimeType,
  validateCardMediaFile
} from "@/lib/cards/media";

describe("card media helpers", () => {
  it("keeps the MVP photo count limit explicit", () => {
    expect(CARD_MEDIA_MAX_COUNT).toBe(7);
  });

  it("accepts supported image mime types", () => {
    expect(isSupportedCardMediaMimeType("image/jpeg")).toBe(true);
    expect(isSupportedCardMediaMimeType("image/png")).toBe(true);
    expect(isSupportedCardMediaMimeType("image/webp")).toBe(true);
    expect(isSupportedCardMediaMimeType("image/gif")).toBe(false);
  });

  it("builds file names with the slot prefix and extension", () => {
    const fileName = buildCardMediaFileName("portrait", "photo.png", "image/png");

    expect(fileName.startsWith("portrait-")).toBe(true);
    expect(fileName.endsWith(".png")).toBe(true);
  });

  it("keeps support for two-line captions in stored assets", () => {
    const asset = {
      captionTitle: "Наш выпускной",
      captionSubtitle: "День, который хочется вспоминать"
    };

    expect(asset.captionTitle).toBe("Наш выпускной");
    expect(asset.captionSubtitle).toContain("вспоминать");
  });

  it("rejects unsupported files and oversize uploads", () => {
    const invalidType = new File([new Uint8Array([1, 2, 3])], "photo.gif", { type: "image/gif" });
    const tooLarge = new File([new Uint8Array(CARD_MEDIA_MAX_BYTES + 1)], "photo.jpg", { type: "image/jpeg" });

    expect(validateCardMediaFile(invalidType)).toBe("Пока поддерживаются только JPG, PNG и WebP.");
    expect(validateCardMediaFile(tooLarge)).toBe("Файл слишком большой. Пока держим лимит до 6 МБ.");
  });
});
