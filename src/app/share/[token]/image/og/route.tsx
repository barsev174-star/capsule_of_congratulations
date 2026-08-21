/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- ImageResponse rasterizes these decorative layers. */
import { ImageResponse } from "next/og";
import { getPublicSharePayload } from "@/lib/public-shares/service";
import { getPublicShareOgTemplate } from "@/lib/public-shares/metadata";
import type { PublicSharePayload, PublicSharePayloadV1, PublicSharePayloadV2 } from "@/lib/public-shares/types";
import { resolveTemplateExportAsset } from "@/lib/templates/export-asset-url";
import { catalogTemplateRegistrations } from "@/lib/templates/registry";

export const runtime = "nodejs";

const getAssetOrigin = (request: Request) => process.env.NODE_ENV === "production"
  ? `http://127.0.0.1:${process.env.PORT?.trim() || "3000"}`
  : new URL(request.url).origin;

const absoluteAsset = (origin: string, path: `/${string}`) => new URL(path, origin).toString();

const getDevelopmentBaselinePayload = (token: string): PublicSharePayload | null => {
  if (process.env.NODE_ENV !== "development" || !token.startsWith("og-baseline-")) return null;
  const templateId = token.replace("og-baseline-", "");
  const registration = catalogTemplateRegistrations.find(({ id }) => id === templateId);
  if (!registration) return null;
  const shared = {
    share: { displayName: null, headlinePreset: "GIFTED_CARD" as const, showOccasion: false, showGreetingCount: false, showPhotoCount: false },
    card: { templateId, occasionText: null, fromLabel: null, greetingCount: 0, photoCount: 0 },
    qualities: [],
    phrases: [],
    photos: []
  };
  if (registration.family === "universal-v1") {
    return {
      version: 2,
      family: "universal-v1",
      ...shared,
      share: { ...shared.share, showEventDate: false },
      card: { ...shared.card, eventDate: null }
    } satisfies PublicSharePayloadV2;
  }
  return { version: 1, ...shared, summary: null } satisfies PublicSharePayloadV1;
};

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = getDevelopmentBaselinePayload(token) ?? await getPublicSharePayload(token);
  if (!payload) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const template = getPublicShareOgTemplate(payload.card.templateId);
  const assetOrigin = getAssetOrigin(request);
  const preview = resolveTemplateExportAsset(template.preview, assetOrigin);
  return new ImageResponse(
    <div style={{
      position: "relative",
      display: "flex",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: template.background,
      color: "#202124",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ position: "absolute", display: "flex", width: 360, height: 360, left: -150, top: -170, borderRadius: 999, background: template.accentSurface }} />
      <div style={{ position: "absolute", display: "flex", width: 240, height: 240, left: 340, bottom: -170, borderRadius: 999, background: "#fff0e8" }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 610, padding: "66px 38px 58px 72px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", color: "#e9652f", fontSize: 24, fontWeight: 700, letterSpacing: .4 }}>
            Публичная открытка
          </div>
          <div style={{ display: "flex", maxWidth: 520, marginTop: 18, fontSize: 54, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.2 }}>
            Тёплые слова уже внутри
          </div>
          <div style={{ display: "flex", maxWidth: 480, marginTop: 22, color: "#5f6368", fontSize: 25, lineHeight: 1.35 }}>
            Откройте открытку, которой хочется поделиться
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={absoluteAsset(assetOrigin, "/brand/logo-mark.svg")} style={{ width: 48, height: 48, objectFit: "contain" }} />
            <div style={{ display: "flex", color: "#202124", fontSize: 31, fontWeight: 700, letterSpacing: -.4 }}>Slovesto</div>
          </div>
          <div style={{ display: "flex", marginTop: 7, color: "#8a9099", fontSize: 18 }}>
            Место, где слова становятся подарком
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: "48px 58px 48px 18px", boxSizing: "border-box" }}>
        <div style={{
          position: "relative",
          display: "flex",
          width: 500,
          height: 390,
          padding: 10,
          overflow: "hidden",
          borderRadius: 34,
          background: "#ffffff",
          boxShadow: "0 0 0 1px rgba(0,0,0,.08), 0 18px 42px rgba(0,0,0,.14)",
          transform: "rotate(2deg)"
        }}>
          <img src={preview} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24, outline: "1px solid rgba(0,0,0,.1)", outlineOffset: -1 }} />
          <div style={{ position: "absolute", display: "flex", left: 28, bottom: 26, padding: "10px 18px", borderRadius: 999, background: "rgba(255,255,255,.94)", color: "#202124", fontSize: 19, fontWeight: 700, boxShadow: "0 0 0 1px rgba(0,0,0,.06), 0 4px 14px rgba(0,0,0,.1)" }}>
            {template.name}
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex, nofollow"
      }
    }
  );
}
