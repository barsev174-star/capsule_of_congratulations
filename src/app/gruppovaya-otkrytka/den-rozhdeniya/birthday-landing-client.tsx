"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { startBirthdayCardFromShowcaseAction } from "@/app/home-actions";
import { BIRTHDAY_EXAMPLE_PATH } from "@/lib/birthday-scenario";
import { getBirthdayTelemetryContext } from "@/lib/client-landing-attribution";
import { sendClientTelemetry } from "@/lib/client-telemetry";

export function BirthdayLandingTracker() {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendClientTelemetry("seo_landing_view", getBirthdayTelemetryContext());
  }, []);
  return null;
}

export function BirthdayCreateForm({ placement, buttonClassName, children }: {
  placement: "hero" | "example" | "final";
  buttonClassName?: string;
  children: ReactNode;
}) {
  return (
    <form action={startBirthdayCardFromShowcaseAction} onSubmit={() => sendClientTelemetry("seo_create_click", {
      ...getBirthdayTelemetryContext(), placement, template: "paper-birthday"
    })}>
      <button type="submit" className={buttonClassName}>{children}</button>
    </form>
  );
}

export function BirthdayExampleLink({ className, children, placement = "example", alternative = false }: {
  className?: string;
  children: ReactNode;
  placement?: "hero" | "example" | "moments";
  alternative?: boolean;
}) {
  return (
    <Link className={className} href={alternative ? "/example?template=route-adventure" : BIRTHDAY_EXAMPLE_PATH} onClick={() => sendClientTelemetry("seo_example_click", {
      ...getBirthdayTelemetryContext(), placement, template: alternative ? "route-adventure" : "paper-birthday"
    })}>
      {children}
    </Link>
  );
}
