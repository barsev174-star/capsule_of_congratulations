"use client";

import { useEffect } from "react";
import { sendClientTelemetry } from "@/lib/client-telemetry";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    sendClientTelemetry("client.unhandled_error", { route: "global", component: error.digest ?? "root" });
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <main style={{ maxWidth: 640, margin: "80px auto", padding: 24, textAlign: "center" }}>
          <h1>Сервис временно недоступен</h1>
          <p>Сбой уже зафиксирован. Попробуйте открыть страницу ещё раз.</p>
          <button type="button" onClick={reset}>Обновить</button>
        </main>
      </body>
    </html>
  );
}
