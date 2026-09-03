"use client";

import { useEffect, useRef } from "react";
import { ensureHomeFirstTouch } from "@/lib/client-landing-attribution";
import { isHomeActivityPlacement, type HomeActivityEvent, type HomeActivityPlacement } from "@/lib/home-activity";

const sendActivity = (event: HomeActivityEvent, placement?: HomeActivityPlacement) => {
  // Counts carry no browser/card identifier, attribution cookie or referring URL.
  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, context: { ...(placement ? { placement } : {}) } }),
    credentials: "omit",
    referrerPolicy: "no-referrer",
    keepalive: true
  }).catch(() => { /* Statistics must never interrupt creating a card. */ });
};

export function HomePageTracker() {
  const viewed = useRef(false);

  useEffect(() => {
    ensureHomeFirstTouch();
    if (!viewed.current) {
      viewed.current = true;
      sendActivity("home_page_view");
    }

    const trackControl = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(event.type === "submit" ? "form[data-home-action]" : "a[data-home-action]");
      if (!(control instanceof HTMLElement)) return;
      const { homeAction, homePlacement } = control.dataset;
      if (!isHomeActivityPlacement(homePlacement) || (homeAction !== "create" && homeAction !== "example")) return;
      // Synchronous cookie capture also covers a click immediately after hydration.
      ensureHomeFirstTouch();
      sendActivity(homeAction === "create" ? "home_create_click" : "home_example_click", homePlacement);
    };

    document.addEventListener("click", trackControl, true);
    document.addEventListener("submit", trackControl, true);
    return () => {
      document.removeEventListener("click", trackControl, true);
      document.removeEventListener("submit", trackControl, true);
    };
  }, []);

  return null;
}
