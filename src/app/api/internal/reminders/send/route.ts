import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runEventReminderBatch } from "@/lib/reminders/service";

export const dynamic = "force-dynamic";

const hasValidSecret = (request: Request) => {
  const configured = process.env.CRON_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export async function POST(request: Request) {
  if (!hasValidSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runEventReminderBatch());
}
