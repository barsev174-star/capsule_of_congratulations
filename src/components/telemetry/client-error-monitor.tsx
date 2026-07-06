"use client";

import { useEffect } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";

export function ClientErrorMonitor() {
  useEffect(() => {
    const report = () => sendClientTelemetry("client.unhandled_error", {
      route: window.location.pathname,
      component: "window"
    });
    window.addEventListener("error", report);
    window.addEventListener("unhandledrejection", report);
    return () => {
      window.removeEventListener("error", report);
      window.removeEventListener("unhandledrejection", report);
    };
  }, []);
  return null;
}
