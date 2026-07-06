import { randomUUID } from "node:crypto";
import { logger, sanitizeLogContext, type LogContext } from "@/lib/logger";
import { recordTelemetryEvent, type TelemetryKind } from "@/lib/telemetry-repository";

export const funnelEvents = [
  "funnel.card_creation_started",
  "funnel.card_created",
  "funnel.participant_link_copied",
  "funnel.participant_form_opened",
  "funnel.contribution_submitted",
  "funnel.card_published",
  "funnel.gift_opened"
] as const;

export const clientEvents = [
  "funnel.participant_link_copied",
  "funnel.participant_form_opened",
  "funnel.gift_opened",
  "client.unhandled_error"
] as const;

export type ClientTelemetryEvent = (typeof clientEvents)[number];
export type CriticalArea = "ai" | "database" | "email" | "media" | "publication" | "client";

const clientEventSet = new Set<string>(clientEvents);
const allowedClientContextKeys = new Set(["cardId", "source", "route", "component"]);

export const parseClientTelemetry = (input: unknown): { event: ClientTelemetryEvent; context: LogContext } | null => {
  if (!input || typeof input !== "object") return null;
  const value = input as { event?: unknown; context?: unknown };
  if (typeof value.event !== "string" || !clientEventSet.has(value.event)) return null;
  const rawContext = value.context && typeof value.context === "object" ? value.context as Record<string, unknown> : {};
  const context = Object.fromEntries(
    Object.entries(rawContext).filter(([key, item]) =>
      allowedClientContextKeys.has(key) && typeof item === "string" && item.length <= 100
    )
  );
  return { event: value.event as ClientTelemetryEvent, context };
};

const persistSafely = async (kind: TelemetryKind, event: string, context?: LogContext, errorId?: string) => {
  const safeContext = sanitizeLogContext(context) ?? {};
  try {
    await recordTelemetryEvent({
      kind, event, context: safeContext,
      cardId: typeof safeContext.cardId === "string" ? safeContext.cardId : null,
      errorId: errorId ?? null
    });
  } catch {
    logger.warn("telemetry.persistence_failed", "Telemetry event could not be persisted", { event });
  }
};

export const trackFunnel = async (event: (typeof funnelEvents)[number], context?: LogContext) => {
  logger.info(event, "User journey event", context);
  await persistSafely("funnel", event, context);
};

export const reportCriticalError = async (area: CriticalArea, error: unknown, context?: LogContext) => {
  const errorId = randomUUID();
  const event = `critical.${area}`;
  logger.error(event, "Critical operation failed", {
    ...context,
    errorId,
    errorType: error instanceof Error ? error.name : "UnknownError"
  });
  await persistSafely(area === "client" ? "client_error" : "critical", event, context, errorId);
  return errorId;
};
