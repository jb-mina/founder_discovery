import { getPostHog } from "./client";

export type LengthBucket = "short" | "medium" | "long";

export function bucketLength(n: number): LengthBucket {
  if (n < 60) return "short";
  if (n < 300) return "medium";
  return "long";
}

type LandingSection =
  | "hero"
  | "traps"
  | "cycle"
  | "agents"
  | "moat"
  | "final_cta";

type ScrollDepth = 25 | 50 | 75 | 100;

type FormLocation = "top" | "bottom";

type SubmitErrorKind = "validation" | "rate_limit" | "network" | "other";

type SelfMapCategory =
  | "values"
  | "strengths"
  | "fears"
  | "curiosity"
  | "energy"
  | "history";

type ProblemSource = "manual" | "scout_news" | "scout_other";

type ProblemStage = "idea" | "discovery" | "validation" | "archived";

type SolutionSource = "manual" | "ai_suggested";

type SolutionStatus = "active" | "shelved" | "broken" | "confirmed";

type HypothesisAxis = "existence" | "severity" | "fit" | "willingness";

type HypothesisStatus =
  | "not_started"
  | "in_progress"
  | "broken"
  | "confirmed";

type AgentName =
  | "self_insight"
  | "problem_scout"
  | "fit_judge"
  | "validation_designer"
  | "solution_suggester"
  | "reality_check";

type AgentResponseStatus = "ok" | "error";

type AgentErrorKind = "parse" | "rate_limit" | "timeout" | "other";

type DashboardWidget =
  | "north_star_problem"
  | "north_star_solution"
  | "next_action"
  | "active_solution"
  | "trap_alert"
  | "loop_stage"
  | "top_fit";

type DashboardTrapKind = "trap_solution_drift" | "trap_empathy_vs_payment";

type RatioBucket = "0" | "lt50" | "gte50";

type LoopStage =
  | "self_map"
  | "problems"
  | "fit"
  | "problem_validation"
  | "solution_validation";

export type AnalyticsEvent =
  | {
      event: "landing_section_viewed";
      props: { section: LandingSection };
    }
  | {
      event: "landing_scroll_depth";
      props: { depth: ScrollDepth };
    }
  | {
      event: "landing_header_cta_clicked";
      props: Record<string, never>;
    }
  | {
      event: "landing_email_focused";
      props: { location: FormLocation };
    }
  | {
      event: "landing_email_submitted";
      props: {
        location: FormLocation;
        status: "ok" | "error";
        error_kind?: SubmitErrorKind;
      };
    }
  | {
      event: "app_loaded";
      props: { route: string };
    }
  | {
      event: "self_map_entry_added";
      props: {
        category: SelfMapCategory;
        length_bucket: LengthBucket;
        has_tags: boolean;
        tag_count: number;
      };
    }
  | {
      event: "self_map_entry_edited";
      props: {
        category: SelfMapCategory;
        length_bucket: LengthBucket;
        category_changed: boolean;
      };
    }
  | {
      event: "problem_card_created";
      props: { source: ProblemSource; stage: ProblemStage };
    }
  | {
      event: "fit_evaluation_submitted";
      props: { total_score: number; dimensions_filled: number };
    }
  | {
      event: "solution_hypothesis_created";
      props: {
        source: SolutionSource;
        statement_length_bucket: LengthBucket;
      };
    }
  | {
      event: "solution_hypothesis_status_changed";
      props: {
        from: SolutionStatus;
        to: SolutionStatus;
        cascaded: boolean;
      };
    }
  | {
      event: "hypothesis_status_changed";
      props: {
        axis: HypothesisAxis;
        from: HypothesisStatus;
        to: HypothesisStatus;
      };
    }
  | {
      event: "agent_invoked";
      props: { agent: AgentName };
    }
  | {
      event: "agent_response_received";
      props: {
        agent: AgentName;
        latency_ms: number;
        status: AgentResponseStatus;
        error_kind?: AgentErrorKind;
      };
    }
  | {
      event: "dashboard_viewed";
      props: {
        has_active_solution: boolean;
        active_solution_count: number;
        trap_count: number;
        north_star_problem_bucket: RatioBucket;
        north_star_solution_bucket: RatioBucket;
        current_stage: LoopStage;
      };
    }
  | {
      event: "dashboard_widget_clicked";
      props: {
        widget: DashboardWidget;
        target_route: string;
        trap_kind?: DashboardTrapKind;
        loop_stage?: LoopStage;
      };
    };

export function track<T extends AnalyticsEvent>(e: T): void {
  const ph = getPostHog();
  if (!ph) return;
  ph.capture(e.event, e.props);
}
