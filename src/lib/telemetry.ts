import { randomUUID } from "node:crypto";
import {
  getConfiguredCriticalAlertChannels,
  logMissingCriticalAlertChannels
} from "@/lib/critical-alerts/notifications";
import { enqueueCriticalAlert } from "@/lib/critical-alerts/repository";
import { logger, sanitizeLogContext, type LogContext } from "@/lib/logger";
import { recordTelemetryEvent, type TelemetryKind } from "@/lib/telemetry-repository";

export const funnelEvents = [
  "funnel.card_creation_started",
  "funnel.card_created",
  "funnel.participant_link_copied",
  "funnel.participant_form_opened",
  "funnel.contribution_submitted",
  "gift_first_opened"
] as const;

export const clientEvents = [
  "funnel.participant_link_copied",
  "funnel.participant_form_opened",
  "gift_first_opened",
  "client.unhandled_error",
  "demo_page_view",
  "demo_template_selected",
  "demo_reveal_selected",
  "demo_animation_started",
  "demo_animation_preview_opened",
  "demo_gift_opened",
  "demo_card_opened",
  "demo_create_clicked",
  "demo_scroll_step_viewed",
  "REVEAL_SETTINGS_MODAL_OPENED",
  "REVEAL_SETTINGS_MODAL_CLOSED",
  "REVEAL_TYPE_SELECTED",
  "REVEAL_EXAMPLE_OPENED",
  "seo_landing_view",
  "seo_create_click",
  "seo_example_click",
  "PUBLIC_SHARE_OPENED",
  "PUBLIC_SHARE_NATIVE_SHARED",
  "PUBLIC_SHARE_LINK_COPIED",
  "PUBLIC_SHARE_DOWNLOAD_MENU_OPENED",
  "PUBLIC_SHARE_DOWNLOAD_DIALOG_OPENED",
  "PUBLIC_SHARE_EXPORT_FAILED",
  "PUBLIC_SHARE_POST_DOWNLOADED",
  "PUBLIC_SHARE_STORY_DOWNLOADED",
  "PUBLIC_SHARE_PRINT_DOWNLOADED",
  "PUBLIC_SHARE_CREATE_CARD_CLICKED",
  "photo_slot_opened",
  "photo_upload_started",
  "photo_preparation_completed",
  "photo_transfer_started",
  "photo_transfer_completed",
  "photo_upload_completed",
  "photo_upload_failed",
  "photo_replaced",
  "photo_deleted",
  "photo_moved",
  "photo_caption_updated",
  "photo_layout_edit_clicked",
  "moments_enabled_from_photos",
  "moments_disabled"
] as const;

export type ClientTelemetryEvent = (typeof clientEvents)[number];
export type CriticalArea = "ai" | "database" | "email" | "media" | "publication" | "client";

const clientEventSet = new Set<string>(clientEvents);
const allowedClientContextKeys = new Set([
  "cardId",
  "source",
  "route",
  "component",
  "step",
  "template",
  "animation",
  "templateId",
  "revealType",
  "previewedRevealType",
  "savedRevealType",
  "ctaPosition",
  "block",
  "slot",
  "layout",
  "deviceType",
  "durationMs",
  "originalBytes",
  "uploadBytes",
  "optimized",
  "landing_type",
  "landing_path",
  "placement",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "referrer_host",
  "first_touch_at"
]);

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
    return await recordTelemetryEvent({
      kind, event, context: safeContext,
      cardId: typeof safeContext.cardId === "string" ? safeContext.cardId : null,
      errorId: errorId ?? null
    });
  } catch {
    logger.warn("telemetry.persistence_failed", "Telemetry event could not be persisted", { event });
    return null;
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
  const persisted = await persistSafely(area === "client" ? "client_error" : "critical", event, context, errorId);
  if (area !== "client" && persisted) {
    const channels = getConfiguredCriticalAlertChannels();
    if (channels.length === 0) {
      logMissingCriticalAlertChannels(event);
    } else {
      try {
        await enqueueCriticalAlert({ errorId, event, context: persisted.context, channels });
      } catch {
        logger.warn("critical_alert.enqueue_failed", "Critical error was persisted but external alert enqueue failed", {
          event,
          errorId
        });
      }
    }
  }
  return errorId;
};
