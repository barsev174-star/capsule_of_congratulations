import { logger, type LogContext } from "@/lib/logger";
import { hasConfiguredEmailTransport, sendTransactionalEmail } from "@/lib/email/transport";
import type { CriticalAlertChannel, CriticalAlertDelivery } from "./types";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
})[character] ?? character);

const configuredEmail = () => process.env.CRITICAL_ALERT_EMAIL?.trim()
  || process.env.SUPPORT_NOTIFICATION_EMAIL?.trim()
  || "support@slovesto.ru";

export const getConfiguredCriticalAlertChannels = (): CriticalAlertChannel[] => [
  ...(hasConfiguredEmailTransport() && configuredEmail()
    ? ["email" as const]
    : [])
];

const visibleContextKeys = [
  "operation", "cardId", "orderId", "requestId", "route", "channel",
  "component", "step", "template", "status", "invoiceId"
] as const;

export const getVisibleCriticalAlertContext = (context: LogContext) => Object.fromEntries(
  visibleContextKeys.flatMap((key) => {
    const value = context[key];
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? [[key, String(value).slice(0, 160)] as const]
      : [];
  })
);

const adminUrl = () => `${(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://slovesto.ru").replace(/\/$/, "")}/admin/analytics?days=7`;

const sendCriticalAlertEmail = async (delivery: CriticalAlertDelivery) => {
  if (!hasConfiguredEmailTransport()) throw new Error("Critical alert email is not configured");
  const details = getVisibleCriticalAlertContext(delivery.context);
  const detailRows = Object.entries(details).map(([key, value]) =>
    `<tr><td style="padding:5px 12px 5px 0;color:#5f6368">${escapeHtml(key)}</td><td style="padding:5px 0;color:#202124">${escapeHtml(value)}</td></tr>`
  ).join("");
  await sendTransactionalEmail({
    to: configuredEmail(),
    idempotencyKey: `critical-alert-${delivery.id}`,
    subject: `[Slovesto alert] ${delivery.event}`,
    html: `<div style="font-family:Arial,sans-serif;color:#202124;line-height:1.55;max-width:640px;margin:auto"><div style="padding:20px 22px;background:#f7f8fa;border-radius:18px"><p style="margin:0 0 8px;color:#e9652f;font-weight:700">Критическая ошибка Slovesto</p><h1 style="margin:0 0 16px;font-size:24px">${escapeHtml(delivery.event)}</h1><p><strong>Error ID:</strong> ${escapeHtml(delivery.errorId)}</p>${detailRows ? `<table style="border-collapse:collapse">${detailRows}</table>` : ""}<p style="margin:18px 0 0"><a href="${escapeHtml(adminUrl())}" style="color:#e9652f;font-weight:700">Открыть журнал ошибок</a></p></div><p style="color:#8a9099;font-size:13px">Тексты поздравлений, фотографии, email и секреты в уведомление не включаются.</p></div>`,
    text: [`Критическая ошибка Slovesto: ${delivery.event}`, `Error ID: ${delivery.errorId}`, ...Object.entries(details).map(([key, value]) => `${key}: ${value}`), `Журнал: ${adminUrl()}`].join("\n")
  });
};

export const sendCriticalAlert = async (delivery: CriticalAlertDelivery) => {
  return sendCriticalAlertEmail(delivery);
};

export const logMissingCriticalAlertChannels = (event: string) => {
  logger.warn("critical_alert.channels_missing", "Critical error was persisted without an external alert channel", { event });
};
