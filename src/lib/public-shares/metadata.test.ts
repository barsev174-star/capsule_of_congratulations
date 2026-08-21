import { describe, expect, it } from "vitest";
import { buildPublicShareMetadata, getPublicShareOgTemplate } from "./metadata";
import type { PublicSharePayloadV2 } from "./types";

const payload: PublicSharePayloadV2 = {
  version: 2,
  family: "universal-v1",
  share: {
    displayName: "Секретное имя",
    headlinePreset: "GIFTED_CARD",
    showOccasion: true,
    showEventDate: true,
    showGreetingCount: true,
    showPhotoCount: true
  },
  card: {
    templateId: "school-scrapbook",
    occasionText: "Секретный повод",
    eventDate: "2026-09-01",
    fromLabel: "Секретная подпись",
    greetingCount: 12,
    photoCount: 3
  },
  qualities: ["качество"],
  phrases: ["личная фраза"],
  photos: [{
    id: "photo-1",
    url: "/share/token/photo/private",
    width: 100,
    height: 100,
    caption: "личная подпись",
    crop: { x: .5, y: .5, zoom: 1 }
  }]
};

describe("public share metadata", () => {
  it("publishes a large image for universal public cards without personal metadata", () => {
    const metadata = buildPublicShareMetadata("public token", payload);
    const serialized = JSON.stringify(metadata);

    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({
      url: "/share/public%20token/image/og",
      width: 1200,
      height: 630
    })]);
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(serialized).not.toContain("Секретное имя");
    expect(serialized).not.toContain("личная фраза");
    expect(serialized).not.toContain("private");
  });

  it("knows all three product template previews", () => {
    expect(getPublicShareOgTemplate("paper-birthday").preview).toContain("template-paper");
    expect(getPublicShareOgTemplate("route-adventure").preview).toContain("route-adventure");
    expect(getPublicShareOgTemplate("school-scrapbook").preview).toContain("school-scrapbook");
  });
});
