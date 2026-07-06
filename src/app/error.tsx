"use client";

import { useEffect } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    sendClientTelemetry("client.unhandled_error", { route: window.location.pathname, component: error.digest ?? "app" });
  }, [error]);

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <h1>Что-то пошло не так</h1>
      <p>Мы зафиксировали сбой. Попробуйте повторить действие.</p>
      <button type="button" onClick={reset}>Попробовать ещё раз</button>
    </main>
  );
}
