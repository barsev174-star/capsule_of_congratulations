"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { startNewYearCardFromShowcaseAction } from "@/app/home-actions";
import { getNewYearTelemetryContext } from "@/lib/client-landing-attribution";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { winterWonderAnimation } from "@/lib/gift-animations";

type Theme = "red" | "green";

export function NewYearLandingTracker() {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendClientTelemetry("seo_landing_view", getNewYearTelemetryContext());
  }, []);
  return null;
}

export function NewYearCreateForm({ placement, theme = "red", buttonClassName, children }: {
  placement: "hero" | "examples" | "final";
  theme?: Theme;
  buttonClassName: string;
  children: ReactNode;
}) {
  return (
    <form action={startNewYearCardFromShowcaseAction} onSubmit={() => sendClientTelemetry("seo_create_click", {
      ...getNewYearTelemetryContext(), placement, template: "new-year"
    })}>
      <input type="hidden" name="templateTheme" value={theme} />
      <button type="submit" className={buttonClassName}>{children}</button>
    </form>
  );
}

export function NewYearDemoLink({ placement, theme = "red", className, label, children }: {
  placement: "hero" | "comparison" | "examples" | "animation";
  theme?: Theme;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const template = `new-year-${theme}`;
  const animation = placement === "animation" ? winterWonderAnimation.id : undefined;
  const query = new URLSearchParams({ template, preview: animation ? "animation" : "recipient" });
  if (animation) query.set("animation", animation);

  return (
    <Link href={`/example?${query}`} prefetch={false} className={className} aria-label={label} onClick={() => sendClientTelemetry("seo_example_click", {
      ...getNewYearTelemetryContext(), placement, template, ...(animation ? { animation } : {})
    })}>
      {children}
    </Link>
  );
}
