import { NextResponse } from "next/server";
import { purgeExpiredCards } from "@/lib/cards/repository";
import { logger } from "@/lib/logger";
import { reportCriticalError } from "@/lib/telemetry";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const purged = await purgeExpiredCards();
    const deleted = purged.filter((item) => item.reason === "deleted").length;
    const inactiveDrafts = purged.filter((item) => item.reason === "inactive_draft").length;
    logger.info("retention.cards_purged", "Expired cards permanently removed", { deleted, inactiveDrafts });
    return NextResponse.json({ ok: true, deleted, inactiveDrafts });
  } catch (error) {
    const errorId = await reportCriticalError("database", error, { operation: "retention_purge" });
    return NextResponse.json({ ok: false, message: "Retention cleanup failed", errorId }, { status: 500 });
  }
}
