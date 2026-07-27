import { ImageResponse } from "next/og";
import { getPublicSharePayload } from "@/lib/public-shares/service";

export const runtime = "nodejs";

const dimensions = {
  og: { width: 1200, height: 630 },
  post: { width: 1200, height: 1200 },
  story: { width: 1080, height: 1920 }
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; format: string }> }) {
  const { token, format } = await params;
  if (!(format in dimensions)) return new Response(null, { status: 404 });
  const payload = await getPublicSharePayload(token);
  if (!payload) return new Response(null, { status: 404 });
  const { width, height } = dimensions[format as keyof typeof dimensions];
  const isStory = format === "story";
  const title = payload.share.displayName ?? "Мне подарили открытку";
  const occasion = payload.card.occasionText ?? "Тёплый подарок";
  const count = payload.share.showGreetingCount ? `${payload.card.greetingCount} поздравлений` : "";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isStory ? 86 : 66, background: "#fff5e7", color: "#563b34", position: "relative" }}>
      <div style={{ position: "absolute", inset: 26, display: "flex", border: "3px solid #f0dcc4", borderRadius: 18 }} />
      <div style={{ display: "flex", color: "#c95d7b", fontSize: isStory ? 34 : 28, fontWeight: 700, letterSpacing: 3 }}>SLOVESTO</div>
      <div style={{ display: "flex", marginTop: isStory ? 80 : 52, padding: isStory ? "62px 50px" : "44px 58px", maxWidth: "92%", flexDirection: "column", alignItems: "center", background: "#fffaf1", boxShadow: "0 16px 40px rgba(102, 64, 38, 0.16)", borderRadius: 10 }}>
        <div style={{ display: "flex", color: "#c95d7b", fontSize: isStory ? 36 : 28 }}>МНЕ ПОДАРИЛИ ОТКРЫТКУ</div>
        <div style={{ display: "flex", marginTop: 28, color: "#cc5d7a", fontFamily: "serif", fontStyle: "italic", fontSize: isStory ? 124 : 94, textAlign: "center" }}>{title}</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: isStory ? 42 : 32, textAlign: "center" }}>{occasion}</div>
        {count ? <div style={{ display: "flex", marginTop: 42, padding: "15px 24px", borderRadius: 999, background: "#fff1ed", color: "#805243", fontSize: isStory ? 30 : 24 }}>{count}</div> : null}
      </div>
      <div style={{ display: "flex", marginTop: isStory ? 72 : 46, maxWidth: "80%", color: "#795a50", fontSize: isStory ? 32 : 25, textAlign: "center" }}>Тёплые слова становятся подарком</div>
    </div>,
    { width, height }
  );
}
