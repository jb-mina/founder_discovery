import { prisma } from "@/lib/prisma";
import type {
  Hypothesis,
  ProblemCard,
  RealityCheck,
  SolutionHypothesis,
} from "@prisma/client";
import {
  PROBLEM_AXES,
  SOLUTION_AXES,
  type HypothesisAxis,
  type HypothesisPrescription,
} from "@/lib/agents/validation-designer/schema";

// ------- Reads -------

export type ProblemValidationView = ProblemCard & {
  hypotheses: Hypothesis[];
  solutionHypotheses: (SolutionHypothesis & {
    hypotheses: Hypothesis[];
    realityChecks: RealityCheck[];
  })[];
  fitEvaluations: { totalScore: number }[];
};

export async function getProblemValidationView(
  problemCardId: string,
): Promise<ProblemValidationView | null> {
  return prisma.problemCard.findUnique({
    where: { id: problemCardId },
    include: {
      hypotheses: { orderBy: { axis: "asc" } },
      solutionHypotheses: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: {
          hypotheses: { orderBy: { axis: "asc" } },
          realityChecks: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      fitEvaluations: { select: { totalScore: true } },
    },
  });
}

export type ProblemValidationListItem = ProblemCard & {
  hypotheses: Hypothesis[];
  solutionHypotheses: (SolutionHypothesis & { hypotheses: Hypothesis[] })[];
  fitEvaluations: { totalScore: number }[];
};

// All problems that have any validation activity (problem-level hypothesis OR
// at least one solution hypothesis attached).
export async function listProblemsInValidation(): Promise<ProblemValidationListItem[]> {
  return prisma.problemCard.findMany({
    where: {
      OR: [
        { hypotheses: { some: {} } },
        { solutionHypotheses: { some: {} } },
      ],
    },
    include: {
      hypotheses: true,
      solutionHypotheses: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: { hypotheses: true },
      },
      fitEvaluations: { select: { totalScore: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  return prisma.hypothesis.findUnique({ where: { id } });
}

export async function getSolutionHypothesis(
  id: string,
): Promise<(SolutionHypothesis & { problemCard: ProblemCard }) | null> {
  return prisma.solutionHypothesis.findUnique({
    where: { id },
    include: { problemCard: true },
  });
}

// ------- Writes -------

function prescriptionData(p: HypothesisPrescription) {
  return {
    axis: p.axis,
    prescribedMethods: JSON.stringify(p.prescribedMethods),
    successSignals: p.successSignals,
    failureSignals: p.failureSignals,
  };
}

// Bootstrap problem-level hypotheses (existence + severity) for a ProblemCard.
// Idempotent — uses upsert so re-running replaces prescriptions but keeps id/findings/status if the row already exists.
export async function bootstrapProblemHypotheses(
  problemCardId: string,
  prescriptions: HypothesisPrescription[],
): Promise<Hypothesis[]> {
  const filtered = prescriptions.filter((p) =>
    PROBLEM_AXES.includes(p.axis as (typeof PROBLEM_AXES)[number]),
  );
  return prisma.$transaction(
    filtered.map((p) =>
      prisma.hypothesis.upsert({
        where: { problemCardId_axis: { problemCardId, axis: p.axis } },
        update: {
          prescribedMethods: JSON.stringify(p.prescribedMethods),
          successSignals: p.successSignals,
          failureSignals: p.failureSignals,
        },
        create: { problemCardId, ...prescriptionData(p) },
      }),
    ),
  );
}

// Create a new SolutionHypothesis along with its two solution-level Hypothesis
// rows (fit + willingness) atomically.
export async function createSolutionHypothesisWithAxes(input: {
  problemCardId: string;
  statement: string;
  source: "manual" | "ai_suggested";
  prescriptions: HypothesisPrescription[];
}): Promise<
  SolutionHypothesis & { hypotheses: Hypothesis[]; problemCard: ProblemCard }
> {
  const filtered = input.prescriptions.filter((p) =>
    SOLUTION_AXES.includes(p.axis as (typeof SOLUTION_AXES)[number]),
  );

  return prisma.solutionHypothesis.create({
    data: {
      problemCardId: input.problemCardId,
      statement: input.statement,
      source: input.source,
      hypotheses: { create: filtered.map((p) => prescriptionData(p)) },
    },
    include: { hypotheses: true, problemCard: true },
  });
}

export async function updateHypothesis(
  id: string,
  patch: { status?: string; findings?: string; prescribedMethods?: string[] },
): Promise<Hypothesis> {
  return prisma.hypothesis.update({
    where: { id },
    data: {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.findings !== undefined ? { findings: patch.findings } : {}),
      ...(patch.prescribedMethods !== undefined
        ? { prescribedMethods: JSON.stringify(patch.prescribedMethods) }
        : {}),
    },
  });
}

export async function updateSolutionHypothesisStatus(
  id: string,
  status: "active" | "shelved" | "confirmed" | "broken",
): Promise<SolutionHypothesis> {
  return prisma.solutionHypothesis.update({ where: { id }, data: { status } });
}

export async function listExistingSolutionStatements(
  problemCardId: string,
): Promise<string[]> {
  const rows = await prisma.solutionHypothesis.findMany({
    where: { problemCardId },
    select: { statement: true },
  });
  return rows.map((r) => r.statement);
}

// Aggregated findings text from problem-level hypotheses, used as agent context.
export async function getProblemFindings(problemCardId: string): Promise<string> {
  const rows = await prisma.hypothesis.findMany({
    where: { problemCardId, NOT: { findings: "" } },
    select: { axis: true, findings: true },
  });
  if (rows.length === 0) return "";
  return rows.map((r) => `[${r.axis}] ${r.findings}`).join("\n");
}

// ------- Helpers -------

export function isProblemAxis(axis: string): axis is (typeof PROBLEM_AXES)[number] {
  return (PROBLEM_AXES as readonly string[]).includes(axis);
}

export function isSolutionAxis(axis: string): axis is (typeof SOLUTION_AXES)[number] {
  return (SOLUTION_AXES as readonly string[]).includes(axis);
}

export function progressDots(p: ProblemValidationListItem | ProblemValidationView): {
  confirmed: number;
  total: number;
} {
  // Total = problem hypotheses + active solution's solution hypotheses (if any)
  const problemHypotheses = p.hypotheses ?? [];
  const activeSolution = (p.solutionHypotheses ?? []).find((s) => s.status === "active");
  const solutionHypotheses = activeSolution?.hypotheses ?? [];
  const all = [...problemHypotheses, ...solutionHypotheses];
  const confirmed = all.filter((h) => h.status === "confirmed").length;
  return { confirmed, total: 4 };
}

export type { Hypothesis, RealityCheck, SolutionHypothesis };
export { PROBLEM_AXES, SOLUTION_AXES, type HypothesisAxis };
