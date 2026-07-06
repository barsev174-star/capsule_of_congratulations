import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { parseClientTelemetry } from "@/lib/telemetry";
import { recordTelemetryEvent } from "@/lib/telemetry-repository";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const telemetry = parseClientTelemetry(body);
  if (!telemetry) return NextResponse.json({ ok: false }, { status: 400 });

  const level = telemetry.event === "client.unhandled_error" ? "error" : "info";
  logger[level](telemetry.event, "Client telemetry event", telemetry.context);
  try {
    await recordTelemetryEvent({
      kind: telemetry.event === "client.unhandled_error" ? "client_error" : "funnel",
      event: telemetry.event,
      cardId: typeof telemetry.context.cardId === "string" ? telemetry.context.cardId : null,
      context: telemetry.context,
      errorId: null
    });
  } catch {
    logger.warn("telemetry.persistence_failed", "Client telemetry event could not be persisted", { event: telemetry.event });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
