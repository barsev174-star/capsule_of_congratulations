import type { ClientTelemetryEvent } from "@/lib/telemetry";

export const sendClientTelemetry = (event: ClientTelemetryEvent, context: Record<string, string> = {}) => {
  const body = JSON.stringify({ event, context });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/telemetry", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
};
