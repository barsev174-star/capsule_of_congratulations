"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { startTeacherCardFromShowcaseAction } from "@/app/home-actions";
import { sendClientTelemetry } from "@/lib/client-telemetry";
import { getTeacherTelemetryContext } from "@/lib/client-landing-attribution";

type Placement = "hero" | "middle" | "final" | "example";

export function TeacherLandingTracker() {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    sendClientTelemetry("seo_landing_view", getTeacherTelemetryContext());
  }, []);

  return null;
}

export function TeacherCreateForm({
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
      action={startTeacherCardFromShowcaseAction}
      className={className}
      onSubmit={() => sendClientTelemetry("seo_create_click", {
        ...getTeacherTelemetryContext(),
        placement,
        template: "school-classic"
      })}
    >
      <button type="submit" className={buttonClassName}>{children}</button>
    </form>
  );
}

export function TeacherExampleLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link
      href="/example?template=school-classic"
      className={className}
      onClick={() => sendClientTelemetry("seo_example_click", {
        ...getTeacherTelemetryContext(),
        template: "school-classic"
      })}
    >
      {children}
    </Link>
  );
}
