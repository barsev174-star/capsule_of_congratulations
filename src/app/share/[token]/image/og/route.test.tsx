import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicSharePayloadV1, PublicSharePayloadV2 } from "@/lib/public-shares/types";

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  imageCalls: [] as Array<{ element: React.ReactElement; options: { width: number; height: number; headers?: Record<string, string> } }>
}));

vi.mock("next/og", () => ({
  ImageResponse: class ImageResponse {
    constructor(element: React.ReactElement, options: { width: number; height: number; headers?: Record<string, string> }) {
      mocks.imageCalls.push({ element, options });
      return new Response("png", { status: 200, headers: { "Content-Type": "image/png", ...options.headers } });
    }
  }
}));
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.imageCalls.length = 0;
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["paper-birthday", baseV1],
    ["route-adventure", { ...baseV1, card: { ...baseV1.card, templateId: "route-adventure" } }],
    ["school-scrapbook", schoolV2]
  ])("renders a safe 1200x630 preview for %s", async (templateId, payload) => {
    mocks.getPayload.mockResolvedValue(payload);
    const response = await GET(new Request("http://localhost:3000/share/token/image/og"), { params: Promise.resolve({ token: "token" }) });
    const serialized = JSON.stringify(mocks.imageCalls[0].element);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(mocks.imageCalls[0].options).toMatchObject({ width: 1200, height: 630 });
    expect(serialized).toContain(templateId === "school-scrapbook" ? "school-scrapbook" : templateId.split("-")[0]);
    expect(serialized).not.toContain("Личное имя");
    expect(serialized).not.toContain("личная фраза");
    expect(serialized).not.toContain("/photo/private");
  });

  it("returns 404 for an unavailable share", async () => {
    mocks.getPayload.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost:3000/share/missing/image/og"), { params: Promise.resolve({ token: "missing" }) });
    expect(response.status).toBe(404);
    expect(mocks.imageCalls).toHaveLength(0);
  });

  it("builds the universal visual baseline from the product registry", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await GET(new Request("http://localhost:3000/share/og-baseline-school-scrapbook/image/og"), {
      params: Promise.resolve({ token: "og-baseline-school-scrapbook" })
    });
    const serialized = JSON.stringify(mocks.imageCalls[0].element);

    expect(response.status).toBe(200);
    expect(serialized).toContain("school-scrapbook");
    expect(mocks.getPayload).not.toHaveBeenCalled();
  });
});
