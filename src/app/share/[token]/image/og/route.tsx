import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPublicSharePayload } from "@/lib/public-shares/service";
import { getPublicShareOgTemplate } from "@/lib/public-shares/metadata";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await getPublicSharePayload(token);
  if (!payload) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  const template = getPublicShareOgTemplate(payload.card.templateId);
  const file = await readFile(path.join(process.cwd(), "public", template.socialImage.slice(1)));
  return new Response(file, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(file.byteLength),
      "Content-Type": "image/png"
    }
  });
}
