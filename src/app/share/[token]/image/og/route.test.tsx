import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicSharePayloadV1, PublicSharePayloadV2 } from "@/lib/public-shares/types";

const mocks = vi.hoisted(() => ({ getPayload: vi.fn() }));
vi.mock("@/lib/public-shares/service", () => ({ getPublicSharePayload: mocks.getPayload }));

import { GET } from "./route";

const baseV1: PublicSharePayloadV1 = {
  version: 1,
  share: { displayName: "Личное имя", headlinePreset: "GIFTED_CARD", showOccasion: true, showGreetingCount: true, showPhotoCount: true },
  card: { templateId: "paper-birthday", occasionText: "Личный повод", fromLabel: "Личная подпись", greetingCount: 10, photoCount: 3 },
  summary: "Личный текст",
  qualities: ["доброта"],
  phrases: ["личная фраза"],
  photos: [{ id: "photo", url: "/share/token/photo/private", caption: "личная подпись фото" }]
};

const schoolV2: PublicSharePayloadV2 = {
  version: 2,
  family: "universal-v1",
  share: { displayName: "Личное имя", headlinePreset: "GIFTED_CARD", showOccasion: true, showEventDate: true, showGreetingCount: true, showPhotoCount: true },
  card: { templateId: "school-scrapbook", occasionText: "Личный повод", eventDate: "2026-09-01", fromLabel: "Личная подпись", greetingCount: 10, photoCount: 3 },
  qualities: ["доброта"],
  phrases: ["личная фраза"],
  photos: [{ id: "photo", url: "/share/token/photo/private", width: 100, height: 100, caption: "личная подпись фото", crop: { x: .5, y: .5, zoom: 1 } }]
};

describe("public share Open Graph image", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["paper-birthday", baseV1],
    ["route-adventure", { ...baseV1, card: { ...baseV1.card, templateId: "route-adventure" } }],
    ["school-scrapbook", schoolV2],
    ["school-classic", { ...schoolV2, card: { ...schoolV2.card, templateId: "school-classic" } }]
  ])("serves a static 1200x630 PNG with crawler-compatible headers for %s", async (_templateId, payload) => {
    mocks.getPayload.mockResolvedValue(payload);
    const response = await GET(new Request("http://localhost:3000/share/token/image/og"), { params: Promise.resolve({ token: "token" }) });
    const file = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(file).metadata();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe(String(file.byteLength));
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("x-robots-tag")).toBeNull();
    expect(metadata).toMatchObject({ format: "png", width: 1200, height: 630 });
  });

  it("returns 404 for an unavailable share", async () => {
    mocks.getPayload.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost:3000/share/missing/image/og"), { params: Promise.resolve({ token: "missing" }) });
    expect(response.status).toBe(404);
  });
});
