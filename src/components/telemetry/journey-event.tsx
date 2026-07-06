"use client";

import { useEffect } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import type { ClientTelemetryEvent } from "@/lib/telemetry";

export function JourneyEvent({ event, cardId, route }: { event: ClientTelemetryEvent; cardId: string; route: string }) {
  useEffect(() => {
    sendClientTelemetry(event, { cardId, route });
  }, [cardId, event, route]);
  return null;
}
