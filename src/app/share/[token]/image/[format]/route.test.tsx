import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTemplateStudioProfile } from "@/lib/templates/studio";
import type { PublicSharePayloadV2 } from "@/lib/public-shares/types";

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  dispatch: vi.fn(),
  imageCalls: [] as Array<{ element: React.ReactElement; options: { width: number; height: number } }>
}));

vi.mock("next/og", () => ({
  ImageResponse: class ImageResponse {
    constructor(element: React.ReactElement, options: { width: number; height: number }) {
      mocks.imageCalls.push({ element, options });
    }
    async arrayBuffer() { return new ArrayBuffer(8); }
  }
}));
vi.mock("node:fs/promises", () => {
  const readFile = vi.fn(async () => Buffer.from("font"));
  return { readFile, default: { readFile } };
});
vi.mock("sharp", () => ({
  default: vi.fn(() => {
    const pipeline = {
      flatten: vi.fn(() => pipeline),
      png: vi.fn(() => pipeline),
      jpeg: vi.fn(() => pipeline),
      toBuffer: vi.fn(async () => Buffer.from("image"))
    };
    return pipeline;
  })
}));
vi.mock("@/lib/public-shares/service", () => ({ getPublicSharePayload: mocks.getPayload }));
vi.mock("@/lib/templates/dispatcher", () => ({ dispatchTemplateRenderer: mocks.dispatch }));

import { UniversalTemplateExportCard } from "@/components/templates/universal-v1/universal-export-card";
import { GET } from "./route";

const profile = createTemplateStudioProfile("universal-export-route-test");
const payload: PublicSharePayloadV2 = {
  version: 2,
  family: "universal-v1",
  share: {
    displayName: "Александра",
    headlinePreset: "GIFTED_CARD",
    showOccasion: true,
    showEventDate: true,
    showGreetingCount: true,
    showPhotoCount: true
  },
  card: {
    templateId: profile.id,
    occasionText: "С днём рождения!",
    eventDate: "2026-08-11",
    fromLabel: "от друзей",
    greetingCount: 12,
    photoCount: 3
  },
  qualities: ["доброта", "надёжность", "юмор", "внимание", "вдохновение"],
  phrases: ["Первая тёплая фраза", "Вторая тёплая фраза", "Третья тёплая фраза"],
  photos: []
};

describe("public share universal export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.imageCalls.length = 0;
    mocks.getPayload.mockResolvedValue(payload);
    mocks.dispatch.mockReturnValue({ kind: "universal-v1", registration: { profile } });
  });

  it("routes payload v2 to the shared universal Story renderer", async () => {
    const webpProfile = structuredClone(profile);
    webpProfile.assets.page = {
      src: "/templates/test/page.webp",
      width: 1536,
      height: 1024
    };
    mocks.dispatch.mockReturnValue({ kind: "universal-v1", registration: { profile: webpProfile } });
    const response = await GET(
      new Request("http://localhost:3000/share/token/image/story"),
      { params: Promise.resolve({ token: "token", format: "story" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(mocks.imageCalls).toHaveLength(1);
    expect(mocks.imageCalls[0].element.type).toBe(UniversalTemplateExportCard);
    expect(mocks.imageCalls[0].element.props.format).toBe("story");
    expect(mocks.imageCalls[0].element.props.model.publicPhotoCount).toBe(3);
    expect(mocks.imageCalls[0].element.props.resolveAsset(webpProfile.assets.page.src))
      .toBe("http://localhost:3000/api/template-export-asset?src=%2Ftemplates%2Ftest%2Fpage.webp&v=2");
    expect(mocks.imageCalls[0].options).toMatchObject({ width: 1080, height: 1920 });
  });

  it("fails closed when the v2 template is not registered as universal-v1", async () => {
    mocks.dispatch.mockReturnValue(null);

    const response = await GET(
      new Request("http://localhost:3000/share/token/image/post"),
      { params: Promise.resolve({ token: "token", format: "post" }) }
    );

    expect(response.status).toBe(404);
    expect(mocks.imageCalls).toHaveLength(0);
  });
});
