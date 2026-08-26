import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cardTemplates } from "@/lib/cards/templates";
import { buildPublicShareMetadata, getPublicShareOgTemplate } from "./metadata";
import { buildParticipantLinkMetadata } from "@/lib/participants/metadata";
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
      url: "/assets/share-og/school-scrapbook-v1.png",
      width: 1200,
      height: 630
    })]);
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(serialized).not.toContain("Секретное имя");
    expect(serialized).not.toContain("личная фраза");
    expect(serialized).not.toContain("private");
  });

  it.each(cardTemplates)("has a generated static social image for $id", async ({ id }) => {
    const socialImage = getPublicShareOgTemplate(id).socialImage;
    const file = path.join(process.cwd(), "public", socialImage.slice(1));
    await expect(access(file)).resolves.toBeUndefined();
    await expect(sharp(file).metadata()).resolves.toMatchObject({ format: "png", width: 1200, height: 630 });
  });

  it.each(cardTemplates)("uses the $id artwork for participant invitations too", ({ id }) => {
    const metadata = buildParticipantLinkMetadata("participant slug", id);
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({
      url: `/assets/share-og/${id}-v1.png`, width: 1200, height: 630
    })]);
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.alternates?.canonical).toBe("/join/participant%20slug");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(metadata)).not.toContain("/manage/");
    expect(JSON.stringify(metadata)).not.toContain("/gift/");
  });

  it("does not inherit a template image for an unavailable invitation", () => {
    const metadata = buildParticipantLinkMetadata("missing", null);
    expect(metadata.openGraph?.images).toEqual([]);
    expect(metadata.twitter?.images).toEqual([]);
    expect(metadata.alternates).toBeUndefined();
  });
});
