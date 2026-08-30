import { NextResponse } from "next/server";
import { purgeExpiredCards } from "@/lib/cards/repository";
import { logger } from "@/lib/logger";
import { purgeSecondaryRetentionData } from "@/lib/retention/repository";
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
    const expiredDelivered = purged.filter((item) => item.reason === "expired_delivered").length;
    const secondary = await purgeSecondaryRetentionData();
    logger.info("retention.completed", "Expired personal data removed or sanitized", {
      deleted,
      inactiveDrafts,
      expiredDelivered,
      ...secondary
    });
    return NextResponse.json({ ok: true, deleted, inactiveDrafts, expiredDelivered, secondary });
  } catch (error) {
    const errorId = await reportCriticalError("database", error, { operation: "retention_purge" });
    return NextResponse.json({ ok: false, message: "Retention cleanup failed", errorId }, { status: 500 });
  }
}
