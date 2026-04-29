"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track } from "@/lib/posthog/events";

type DashboardWidget =
  | "north_star_problem"
  | "north_star_solution"
  | "next_action"
  | "active_solution"
  | "trap_alert"
  | "loop_stage"
  | "top_fit";

type DashboardTrapKind = "trap_solution_drift" | "trap_empathy_vs_payment";

type LoopStage =
  | "self_map"
  | "problems"
  | "fit"
  | "problem_validation"
  | "solution_validation";

export function TrackedLink({
  href,
  widget,
  trapKind,
  loopStage,
  className,
  children,
}: {
  href: string;
  widget: DashboardWidget;
  trapKind?: DashboardTrapKind;
  loopStage?: LoopStage;
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
            ...(loopStage ? { loop_stage: loopStage } : {}),
          },
        });
      }}
    >
      {children}
    </Link>
  );
}
