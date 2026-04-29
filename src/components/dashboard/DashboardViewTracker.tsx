"use client";

import { useEffect } from "react";
import { track } from "@/lib/posthog/events";

type RatioBucket = "0" | "lt50" | "gte50";

type LoopStage =
  | "self_map"
  | "problems"
  | "fit"
  | "problem_validation"
  | "solution_validation";

export function DashboardViewTracker(props: {
  hasActiveSolution: boolean;
  activeSolutionCount: number;
  trapCount: number;
  northStarProblemBucket: RatioBucket;
  northStarSolutionBucket: RatioBucket;
  currentStage: LoopStage;
}) {
  useEffect(() => {
    track({
      event: "dashboard_viewed",
      props: {
        has_active_solution: props.hasActiveSolution,
        active_solution_count: props.activeSolutionCount,
        trap_count: props.trapCount,
        north_star_problem_bucket: props.northStarProblemBucket,
        north_star_solution_bucket: props.northStarSolutionBucket,
        current_stage: props.currentStage,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
