"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/posthog/events";

type DashboardWidget =
  | "north_star_focus"
  | "next_action"
  | "active_solution"
  | "active_solution_more"
  | "trap_alert"
  | "top_fit";

type DashboardTrapKind = "trap_solution_drift" | "trap_empathy_vs_payment";

export function TrackedLink({
  href,
  widget,
  trapKind,
  className,
  children,
}: {
  href: string;
  widget: DashboardWidget;
  trapKind?: DashboardTrapKind;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        track({
          event: "dashboard_widget_clicked",
          props: {
            widget,
            target_route: href,
            ...(trapKind ? { trap_kind: trapKind } : {}),
          },
        });
      }}
    >
      {children}
    </Link>
  );
}
