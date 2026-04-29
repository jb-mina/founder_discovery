import { prisma } from "@/lib/prisma";
import {
  axisStatusFor,
  deriveListStatus,
  listEligibleForValidation,
  listProblemsInValidation,
  progressDots,
  type ListStatus,
  type ListStatusKey,
  type ProblemValidationListItem,
} from "@/lib/db/validation";
import type { HypothesisAxis } from "@/lib/agents/validation-designer/schema";

// Stale threshold for the empathy↔payment trap (days). After fit is confirmed
// but willingness has not advanced for this long, surface the warning.
const TRAP_EMPATHY_STALE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Zone 1 — Confidence ----------

export type NorthStarSnapshot = {
  problemConfirmed: number;
  problemTotal: number;
  latestProblemTitle: string | null;
  solutionConfirmed: number;
  solutionTotal: number;
  latestSolutionStatement: string | null;
};

export async function getNorthStar(
  problems?: ProblemValidationListItem[],
): Promise<NorthStarSnapshot> {
  const list = problems ?? (await listProblemsInValidation());

  const withProblemAxes = list.filter((p) =>
    p.hypotheses.some((h) => h.axis === "existence" || h.axis === "severity"),
  );
  const problemConfirmed = withProblemAxes.filter((p) => {
    const e = p.hypotheses.find((h) => h.axis === "existence");
    const s = p.hypotheses.find((h) => h.axis === "severity");
    return e?.status === "confirmed" && s?.status === "confirmed";
  });

  const latestProblem = [...problemConfirmed].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )[0];

  const allSolutions = await prisma.solutionHypothesis.findMany({
    where: { status: { not: "shelved" } },
    orderBy: { updatedAt: "desc" },
    select: { status: true, statement: true, updatedAt: true },
  });
  const confirmedSols = allSolutions.filter((s) => s.status === "confirmed");

  return {
    problemConfirmed: problemConfirmed.length,
    problemTotal: withProblemAxes.length,
    latestProblemTitle: latestProblem?.title ?? null,
    solutionConfirmed: confirmedSols.length,
    solutionTotal: allSolutions.length,
    latestSolutionStatement: confirmedSols[0]?.statement ?? null,
  };
}

export type AccumulatedLearning = {
  confirmedAxes: number;
  brokenAxes: number;
  inProgressAxes: number;
  realityCheckCount: number;
  shelvedSolutions: number;
  confirmedSolutions: number;
  brokenSolutions: number;
};

export async function getAccumulatedLearning(): Promise<AccumulatedLearning> {
  const [
    confirmedAxes,
    brokenAxes,
    inProgressAxes,
    realityCheckCount,
    shelvedSolutions,
    confirmedSolutions,
    brokenSolutions,
  ] = await Promise.all([
    prisma.hypothesis.count({ where: { status: "confirmed" } }),
    prisma.hypothesis.count({ where: { status: "broken" } }),
    prisma.hypothesis.count({ where: { status: "in_progress" } }),
    prisma.realityCheck.count(),
    prisma.solutionHypothesis.count({ where: { status: "shelved" } }),
    prisma.solutionHypothesis.count({ where: { status: "confirmed" } }),
    prisma.solutionHypothesis.count({ where: { status: "broken" } }),
  ]);
  return {
    confirmedAxes,
    brokenAxes,
    inProgressAxes,
    realityCheckCount,
    shelvedSolutions,
    confirmedSolutions,
    brokenSolutions,
  };
}

// ---------- Zone 2 — Now ----------

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

export async function getActiveSolutionRows(
  limit = 5,
  problems?: ProblemValidationListItem[],
): Promise<ActiveSolutionRow[]> {
  const list = problems ?? (await listProblemsInValidation());

  const rows: ActiveSolutionRow[] = [];
  for (const p of list) {
    const active = p.solutionHypotheses.find((s) => s.status === "active");
    if (!active) continue;
    const steps = axisStatusFor(p);
    const { confirmed, total } = progressDots(p);
    const status = deriveListStatus(p);
    rows.push({
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
  return rows
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);
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
  const drift = list
    .filter((p) => {
      if (p.solutionHypotheses.length === 0) return false;
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
  const now = Date.now();
  const empathyMatches: TrapSignal[] = [];
  for (const p of list) {
    for (const sol of p.solutionHypotheses) {
      const fit = sol.hypotheses.find((h) => h.axis === "fit");
      const willingness = sol.hypotheses.find((h) => h.axis === "willingness");
      if (!fit || !willingness) continue;
      if (fit.status !== "confirmed") continue;
      if (willingness.status === "confirmed") continue;
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

// ---------- Zone 3 — Loop ----------

export type LoopStage =
  | "self_map"
  | "problems"
  | "fit"
  | "problem_validation"
  | "solution_validation";

export type LoopFlow = {
  currentStage: LoopStage;
  selfMapCount: number;
  problemCount: number;
  fitCount: number;
  problemValidationCount: number;
  solutionValidationCount: number;
};

export async function getLoopFlow(
  problems?: ProblemValidationListItem[],
): Promise<LoopFlow> {
  const [
    selfMapCount,
    problemCount,
    fitCount,
    latestSelfMap,
    latestProblem,
    latestFit,
    latestProblemAxis,
    latestSolutionAxis,
  ] = await Promise.all([
    prisma.selfMapEntry.count(),
    prisma.problemCard.count(),
    prisma.fitEvaluation.count(),
    prisma.selfMapEntry.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.problemCard.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.fitEvaluation.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.hypothesis.findFirst({
      where: { problemCardId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.hypothesis.findFirst({
      where: { solutionHypothesisId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const list = problems ?? (await listProblemsInValidation());
  let problemValidationCount = 0;
  let solutionValidationCount = 0;
  for (const p of list) {
    if (p.hypotheses.some((h) => h.axis === "existence" || h.axis === "severity")) {
      problemValidationCount += 1;
    }
    if (p.solutionHypotheses.length > 0) {
      solutionValidationCount += 1;
    }
  }

  const candidates: { stage: LoopStage; ts: number }[] = [
    { stage: "self_map", ts: latestSelfMap?.updatedAt.getTime() ?? 0 },
    { stage: "problems", ts: latestProblem?.updatedAt.getTime() ?? 0 },
    { stage: "fit", ts: latestFit?.updatedAt.getTime() ?? 0 },
    { stage: "problem_validation", ts: latestProblemAxis?.updatedAt.getTime() ?? 0 },
    { stage: "solution_validation", ts: latestSolutionAxis?.updatedAt.getTime() ?? 0 },
  ];
  const winner = candidates.reduce((a, b) => (b.ts > a.ts ? b : a));
  const currentStage: LoopStage = winner.ts === 0 ? "self_map" : winner.stage;

  return {
    currentStage,
    selfMapCount,
    problemCount,
    fitCount,
    problemValidationCount,
    solutionValidationCount,
  };
}

export type TopFitCandidate = {
  problemCardId: string;
  title: string;
  who: string;
  totalScore: number;
  inValidation: boolean;
  status: ListStatus | null;
};

export async function getTopFitCandidates(
  limit = 5,
  problems?: ProblemValidationListItem[],
): Promise<TopFitCandidate[]> {
  const rows = await prisma.fitEvaluation.findMany({
    include: { problemCard: true },
    orderBy: [{ totalScore: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });
  const list = problems ?? (await listProblemsInValidation());
  const inValidationMap = new Map<string, ProblemValidationListItem>();
  for (const p of list) inValidationMap.set(p.id, p);

  return rows.map((row) => {
    const inVal = inValidationMap.get(row.problemCardId);
    return {
      problemCardId: row.problemCardId,
      title: row.problemCard.title,
      who: row.problemCard.who,
      totalScore: row.totalScore,
      inValidation: Boolean(inVal),
      status: inVal ? deriveListStatus(inVal) : null,
    };
  });
}

// ---------- Aggregator ----------

export type DashboardData = {
  northStar: NorthStarSnapshot;
  accumulated: AccumulatedLearning;
  nextAction: NextAction;
  activeSolutions: ActiveSolutionRow[];
  traps: TrapSignal[];
  loop: LoopFlow;
  topFit: TopFitCandidate[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const problems = await listProblemsInValidation();
  const [
    northStar,
    accumulated,
    nextAction,
    activeSolutions,
    traps,
    loop,
    topFit,
  ] = await Promise.all([
    getNorthStar(problems),
    getAccumulatedLearning(),
    getNextAction(problems),
    getActiveSolutionRows(5, problems),
    getTrapSignals(problems),
    getLoopFlow(problems),
    getTopFitCandidates(5, problems),
  ]);
  return { northStar, accumulated, nextAction, activeSolutions, traps, loop, topFit };
}

// ---------- Re-exports for component convenience ----------

export type { ListStatusKey };
