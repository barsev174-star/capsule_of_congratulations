"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { startCaregiverCardFromShowcaseAction } from "@/app/home-actions";
import { getCaregiverTelemetryContext } from "@/lib/client-landing-attribution";
import { sendClientTelemetry } from "@/lib/client-telemetry";

type Placement = "hero" | "middle" | "final" | "example";

export function CaregiverLandingTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendClientTelemetry("seo_landing_view", getCaregiverTelemetryContext());
  }, []);

  return null;
}

export function CaregiverCreateForm({
  placement,
  className,
  buttonClassName,
  children
}: {
  placement: Placement;
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={startCaregiverCardFromShowcaseAction}
      className={className}
      onSubmit={() => sendClientTelemetry("seo_create_click", {
        ...getCaregiverTelemetryContext(),
        placement,
        template: "kindergarten-doodles"
      })}
    >
      <button type="submit" className={buttonClassName}>{children}</button>
    </form>
  );
}

export function CaregiverExampleLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link
      href="/example?template=kindergarten-doodles"
      className={className}
      onClick={() => sendClientTelemetry("seo_example_click", {
        ...getCaregiverTelemetryContext(),
        template: "kindergarten-doodles"
      })}
    >
      {children}
    </Link>
  );
}
