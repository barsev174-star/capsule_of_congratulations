import { NextResponse } from "next/server";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export async function GET() {
  if (!isPostgresConfigured()) {
    const production = process.env.NODE_ENV === "production";
    return NextResponse.json(
      { ok: !production, database: production ? "unavailable" : "local" },
      { status: production ? 503 : 200, headers: responseHeaders }
    );
  }

  try {
    await getPostgresPool().query("SELECT 1");
    return NextResponse.json({ ok: true, database: "ready" }, { headers: responseHeaders });
  } catch {
    return NextResponse.json(
      { ok: false, database: "unavailable" },
      { status: 503, headers: responseHeaders }
    );
  }
}
