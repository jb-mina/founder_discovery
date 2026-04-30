import { prisma } from "@/lib/prisma";
import {
  axisStatusFor,
  deriveListStatus,
  listEligibleForValidation,
  listProblemsInValidation,
  progressDots,
  type ListStatus,
  type ProblemValidationListItem,
} from "@/lib/db/validation";
import type { HypothesisAxis } from "@/lib/agents/validation-designer/schema";

// Stale threshold for the empathy↔payment trap (days). After fit is confirmed
// but willingness has not advanced for this long, surface the warning.
const TRAP_EMPATHY_STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- "Broken" gating ----------
//
// Once a problem-level axis (existence/severity) is broken, the problem itself
// is rejected — its solutions stop being meaningful targets. And once a
// solution-axis (fit/willingness) is broken on the active solution, the solution
// is "complete-but-failed" and shouldn't pull attention. Both cases are
// excluded from focus / active list / traps so the dashboard surfaces only
// what the founder still needs to decide on.

function problemHasBrokenAxis(p: ProblemValidationListItem): boolean {
  return p.hypotheses.some(
    (h) =>
      (h.axis === "existence" || h.axis === "severity") &&
      h.status === "broken",
  );
}

function activeSolutionHasBrokenAxis(
  active: ProblemValidationListItem["solutionHypotheses"][number],
): boolean {
  return active.hypotheses.some(
    (h) => (h.axis === "fit" || h.axis === "willingness") && h.status === "broken",
  );
}

// ---------- North star focus ----------

// The single "current bet" — most recently active solution. Replaces the old
// aggregate "X confirmed of Y total" framing because that conflates separate
// problems and obscures progress on the one the founder is actually pushing on.
export type NorthStarFocus = {
  problemCardId: string;
  problemTitle: string;
  solutionHypothesisId: string;
  solutionStatement: string;
  steps: { axis: HypothesisAxis; status: string }[];
  confirmed: number;
  total: number;
  updatedAt: Date;
  // The single concrete next action for this focus, derived from which axis
  // is closest to confirmation. Used for the CTA button on the dashboard.
  nextAxis: HypothesisAxis | null;
  nextActionLabel: string;
} | null;

const FOCUS_AXIS_ORDER: HypothesisAxis[] = [
  "existence",
  "severity",
  "fit",
  "willingness",
];

const FOCUS_AXIS_ACTION: Record<HypothesisAxis, string> = {
  existence: "문제 존재 여부 검증하기",
  severity: "심각도 검증하기",
  fit: "솔루션 핏 검증하기",
  willingness: "지불 의사 검증하기",
};

function focusNextAction(
  steps: { axis: HypothesisAxis; status: string }[],
): { axis: HypothesisAxis | null; label: string } {
  for (const axis of FOCUS_AXIS_ORDER) {
    const step = steps.find((s) => s.axis === axis);
    if (step?.status !== "confirmed") {
      return { axis, label: FOCUS_AXIS_ACTION[axis] };
    }
  }
  return { axis: null, label: "4가설 모두 확인됨 — 솔루션 검토" };
}

export async function getNorthStarFocus(
  problems?: ProblemValidationListItem[],
): Promise<NorthStarFocus> {
  const list = problems ?? (await listProblemsInValidation());

  // Eligible candidates: an active solution whose parent problem is alive
  // (no broken problem-axis) and whose own solution-axes are alive
  // (no broken fit/willingness). The "북극성" should be the most promising
  // bet, not a dead one that happens to be the most recently touched.
  const candidates: {
    p: ProblemValidationListItem;
    sol: ProblemValidationListItem["solutionHypotheses"][number];
    confirmed: number;
    total: number;
  }[] = [];
  for (const p of list) {
    if (problemHasBrokenAxis(p)) continue;
    const active = p.solutionHypotheses.find((s) => s.status === "active");
    if (!active) continue;
    if (activeSolutionHasBrokenAxis(active)) continue;
    const { confirmed, total } = progressDots(p);
    candidates.push({ p, sol: active, confirmed, total });
  }
  if (candidates.length === 0) return null;

  // Closest to the finish line first, tie-break by recency.
  candidates.sort((a, b) => {
    if (b.confirmed !== a.confirmed) return b.confirmed - a.confirmed;
    return b.sol.updatedAt.getTime() - a.sol.updatedAt.getTime();
  });
  const { p, sol, confirmed, total } = candidates[0];
  const steps = axisStatusFor(p);
  const next = focusNextAction(steps);

  return {
    problemCardId: p.id,
    problemTitle: p.title,
    solutionHypothesisId: sol.id,
    solutionStatement: sol.statement,
    steps,
    confirmed,
    total,
    updatedAt: sol.updatedAt,
    nextAxis: next.axis,
    nextActionLabel: next.label,
  };
}

// Aggregate counts across all hypotheses — used as small sub-stats under the
// north star focus card. Tracks "how much have I learned overall."
export type AccumulatedLearning = {
  confirmedAxes: number;
  brokenAxes: number;
  inProgressAxes: number;
};

export async function getAccumulatedLearning(): Promise<AccumulatedLearning> {
  const [confirmedAxes, brokenAxes, inProgressAxes] = await Promise.all([
    prisma.hypothesis.count({ where: { status: "confirmed" } }),
    prisma.hypothesis.count({ where: { status: "broken" } }),
    prisma.hypothesis.count({ where: { status: "in_progress" } }),
  ]);
  return { confirmedAxes, brokenAxes, inProgressAxes };
}

// ---------- Today (next action + traps) ----------

export type NextActionPriority =
  | "in_progress_problem"
  | "in_progress_solution"
  | "no_active_solution"
  | "problem_not_started"
  | "fit_top_candidate";

export type NextAction = {
  problemCardId: string;
  title: string;
  status: ListStatus | null;
  nextStep: string;
  priority: NextActionPriority;
} | null;

function fitScoreOf(p: ProblemValidationListItem): number {
  return p.fitEvaluations[0]?.totalScore ?? 0;
}

export async function getNextAction(
  problems?: ProblemValidationListItem[],
): Promise<NextAction> {
  const list = problems ?? (await listProblemsInValidation());
  const sorted = [...list].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  // 1) problem_validating with any in_progress problem-axis hypothesis
  const p1 = sorted.find((p) => {
    const status = deriveListStatus(p);
    if (status.key !== "problem_validating") return false;
    return p.hypotheses.some(
      (h) =>
        (h.axis === "existence" || h.axis === "severity") &&
        h.status === "in_progress",
    );
  });
  if (p1) {
    const status = deriveListStatus(p1);
    return {
      problemCardId: p1.id,
      title: p1.title,
      status,
      nextStep: status.nextStep,
      priority: "in_progress_problem",
    };
  }

  // 2) solution_validating with any in_progress solution-axis hypothesis
  const p2 = sorted.find((p) => {
    const status = deriveListStatus(p);
    if (status.key !== "solution_validating") return false;
    const active = p.solutionHypotheses.find((s) => s.status === "active");
    return (
      active?.hypotheses.some(
        (h) =>
          (h.axis === "fit" || h.axis === "willingness") &&
          h.status === "in_progress",
      ) ?? false
    );
  });
  if (p2) {
    const status = deriveListStatus(p2);
    return {
      problemCardId: p2.id,
      title: p2.title,
      status,
      nextStep: status.nextStep,
      priority: "in_progress_solution",
    };
  }

  // 3) no_active_solution (highest fit first)
  const p3List = sorted.filter((p) => deriveListStatus(p).key === "no_active_solution");
  const p3 = p3List.sort((a, b) => fitScoreOf(b) - fitScoreOf(a))[0];
  if (p3) {
    const status = deriveListStatus(p3);
    return {
      problemCardId: p3.id,
      title: p3.title,
      status,
      nextStep: status.nextStep,
      priority: "no_active_solution",
    };
  }

  // 4) problem_validating but not_started (just created)
  const p4 = sorted.find((p) => deriveListStatus(p).key === "problem_validating");
  if (p4) {
    const status = deriveListStatus(p4);
    return {
      problemCardId: p4.id,
      title: p4.title,
      status,
      nextStep: status.nextStep,
      priority: "problem_not_started",
    };
  }

  // 5) Eligible (Fit-evaluated, not yet in validation) — highest fit first
  const eligible = await listEligibleForValidation();
  const top = eligible[0];
  if (top) {
    return {
      problemCardId: top.id,
      title: top.title,
      status: null,
      nextStep: "다음: 검증 시작",
      priority: "fit_top_candidate",
    };
  }

  return null;
}

export type TrapKind = "trap_solution_drift" | "trap_empathy_vs_payment";

export type TrapSignal =
  | {
      kind: "trap_solution_drift";
      problemCardId: string;
      problemTitle: string;
      missingAxes: ("existence" | "severity")[];
    }
  | {
      kind: "trap_empathy_vs_payment";
      problemCardId: string;
      solutionHypothesisId: string;
      solutionStatement: string;
      staleDays: number;
    };

export async function getTrapSignals(
  problems?: ProblemValidationListItem[],
): Promise<TrapSignal[]> {
  const list = problems ?? (await listProblemsInValidation());
  const out: TrapSignal[] = [];

  // Trap 1 — solution drift: a SolutionHypothesis exists, but problem axes are
  // not both confirmed. Surface the oldest two such cards.
  // Skip problems with any broken problem-axis: those are already-rejected
  // problems, not "drifting" ones — the founder has decided.
  const drift = list
    .filter((p) => {
      if (p.solutionHypotheses.length === 0) return false;
      if (problemHasBrokenAxis(p)) return false;
      const e = p.hypotheses.find((h) => h.axis === "existence");
      const s = p.hypotheses.find((h) => h.axis === "severity");
      return e?.status !== "confirmed" || s?.status !== "confirmed";
    })
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 2);
  for (const p of drift) {
    const e = p.hypotheses.find((h) => h.axis === "existence");
    const s = p.hypotheses.find((h) => h.axis === "severity");
    const missingAxes: ("existence" | "severity")[] = [];
    if (e?.status !== "confirmed") missingAxes.push("existence");
    if (s?.status !== "confirmed") missingAxes.push("severity");
    out.push({
      kind: "trap_solution_drift",
      problemCardId: p.id,
      problemTitle: p.title,
      missingAxes,
    });
  }

  // Trap 2 — empathy↔payment: solution.fit confirmed AND willingness !confirmed
  // AND willingness.updatedAt is older than the threshold.
  // Skip when willingness is already broken — it's not "stalled," it's decided.
  const now = Date.now();
  const empathyMatches: TrapSignal[] = [];
  for (const p of list) {
    for (const sol of p.solutionHypotheses) {
      const fit = sol.hypotheses.find((h) => h.axis === "fit");
      const willingness = sol.hypotheses.find((h) => h.axis === "willingness");
      if (!fit || !willingness) continue;
      if (fit.status !== "confirmed") continue;
      if (willingness.status === "confirmed") continue;
      if (willingness.status === "broken") continue;
      const staleMs = now - willingness.updatedAt.getTime();
      if (staleMs < TRAP_EMPATHY_STALE_DAYS * DAY_MS) continue;
      empathyMatches.push({
        kind: "trap_empathy_vs_payment",
        problemCardId: p.id,
        solutionHypothesisId: sol.id,
        solutionStatement: sol.statement,
        staleDays: Math.floor(staleMs / DAY_MS),
      });
    }
  }
  out.push(...empathyMatches.slice(0, 2));

  return out;
}

// ---------- Active solution workbench ----------

export type ActiveSolutionRow = {
  problemCardId: string;
  problemTitle: string;
  solutionHypothesisId: string;
  solutionStatement: string;
  steps: { axis: HypothesisAxis; status: string }[];
  confirmed: number;
  total: number;
  nextStep: string;
  updatedAt: Date;
};

export type ActiveSolutionList = {
  rows: ActiveSolutionRow[];
  total: number;
};

export async function getActiveSolutionList(
  limit = 3,
  problems?: ProblemValidationListItem[],
): Promise<ActiveSolutionList> {
  const list = problems ?? (await listProblemsInValidation());

  const allRows: ActiveSolutionRow[] = [];
  for (const p of list) {
    // Skip problems that are already rejected at the problem level — their
    // solution work no longer matters.
    if (problemHasBrokenAxis(p)) continue;
    const active = p.solutionHypotheses.find((s) => s.status === "active");
    if (!active) continue;
    // Defense-in-depth: recomputeSolutionStatus cascade should have already
    // moved any solution with a broken solution-axis to status "broken", but
    // legacy rows from before that cascade can slip through.
    if (activeSolutionHasBrokenAxis(active)) continue;
    const steps = axisStatusFor(p);
    const { confirmed, total } = progressDots(p);
    const status = deriveListStatus(p);
    allRows.push({
      problemCardId: p.id,
      problemTitle: p.title,
      solutionHypothesisId: active.id,
      solutionStatement: active.statement,
      steps,
      confirmed,
      total,
      nextStep: status.nextStep,
      updatedAt: active.updatedAt,
    });
  }
  allRows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return { rows: allRows.slice(0, limit), total: allRows.length };
}

// ---------- Pipeline (eligible-only top fit) ----------

export type TopFitCandidate = {
  problemCardId: string;
  title: string;
  who: string;
  totalScore: number;
};

// Fit-evaluated problems that have NOT yet started validation. Anything already
// in validation is shown in the active solution workbench — surfacing it here
// would just be duplicate noise.
export async function getTopFitCandidates(
  limit = 3,
  problems?: ProblemValidationListItem[],
): Promise<TopFitCandidate[]> {
  const list = problems ?? (await listProblemsInValidation());
  const inValidationIds = list.map((p) => p.id);
  const rows = await prisma.fitEvaluation.findMany({
    where:
      inValidationIds.length > 0
        ? { problemCardId: { notIn: inValidationIds } }
        : undefined,
    include: { problemCard: true },
    orderBy: [{ totalScore: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => ({
    problemCardId: row.problemCardId,
    title: row.problemCard.title,
    who: row.problemCard.who,
    totalScore: row.totalScore,
  }));
}

// ---------- Aggregator ----------

export type DashboardData = {
  focus: NorthStarFocus;
  accumulated: AccumulatedLearning;
  nextAction: NextAction;
  activeSolutions: ActiveSolutionList;
  traps: TrapSignal[];
  topFit: TopFitCandidate[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const problems = await listProblemsInValidation();
  const [focus, accumulated, nextAction, activeSolutions, traps, topFit] =
    await Promise.all([
      getNorthStarFocus(problems),
      getAccumulatedLearning(),
      getNextAction(problems),
      getActiveSolutionList(3, problems),
      getTrapSignals(problems),
      getTopFitCandidates(3, problems),
    ]);
  return { focus, accumulated, nextAction, activeSolutions, traps, topFit };
}
