"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { startColleagueCardFromShowcaseAction } from "@/app/home-actions";
import { getColleagueTelemetryContext } from "@/lib/client-landing-attribution";
import { sendClientTelemetry } from "@/lib/client-telemetry";

type Placement = "hero" | "middle" | "final" | "example";

export function ColleagueLandingTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendClientTelemetry("seo_landing_view", getColleagueTelemetryContext());
  }, []);

  return null;
}

export function ColleagueCreateForm({
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
      action={startColleagueCardFromShowcaseAction}
      className={className}
      onSubmit={() => sendClientTelemetry("seo_create_click", {
        ...getColleagueTelemetryContext(),
        placement,
        template: "team-editorial"
      })}
    >
      <button type="submit" className={buttonClassName}>{children}</button>
    </form>
  );
}

export function ColleagueExampleLink({ className, children, reveal = false }: { className?: string; children: ReactNode; reveal?: boolean }) {
  return (
    <Link
      href="/example?template=team-editorial"
      className={className}
      data-teacher-reveal={reveal ? "" : undefined}
      data-colleague-lift={reveal ? "" : undefined}
      onClick={() => sendClientTelemetry("seo_example_click", {
        ...getColleagueTelemetryContext(),
        template: "team-editorial"
      })}
    >
      {children}
    </Link>
  );
}
