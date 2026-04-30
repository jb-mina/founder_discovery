"use client";

import { useEffect } from "react";
import { track } from "@/lib/posthog/events";

type FocusProgressBucket = "0" | "1" | "2" | "3" | "4";

export function DashboardViewTracker(props: {
  hasFocus: boolean;
  focusProgress?: FocusProgressBucket;
  activeSolutionCount: number;
  trapCount: number;
  eligibleCount: number;
}) {
  useEffect(() => {
    track({
      event: "dashboard_viewed",
      props: {
        has_focus: props.hasFocus,
        ...(props.focusProgress ? { focus_progress: props.focusProgress } : {}),
        active_solution_count: props.activeSolutionCount,
        trap_count: props.trapCount,
        eligible_count: props.eligibleCount,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
