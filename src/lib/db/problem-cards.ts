import { prisma } from "@/lib/prisma";
import type { ProblemCard } from "@prisma/client";

// Cards a user has soft-archived. Includes counts of cascade children so the
// archive page can preview what a permanent delete would remove.
export type ArchivedProblemListItem = ProblemCard & {
  _count: {
    hypotheses: number;
    solutionHypotheses: number;
    fitEvaluations: number;
  };
};

export async function listArchivedProblems(): Promise<ArchivedProblemListItem[]> {
  return prisma.problemCard.findMany({
    where: { archivedAt: { not: null } },
    include: {
      _count: {
        select: {
          hypotheses: true,
          solutionHypotheses: true,
          fitEvaluations: true,
        },
      },
    },
    orderBy: { archivedAt: "desc" },
  });
}

export async function countArchivedProblems(): Promise<number> {
  return prisma.problemCard.count({ where: { archivedAt: { not: null } } });
}

export async function archiveProblemCard(id: string): Promise<ProblemCard> {
  return prisma.problemCard.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function restoreProblemCard(id: string): Promise<ProblemCard> {
  return prisma.problemCard.update({
    where: { id },
    data: { archivedAt: null },
  });
}

// Hard delete. Cascade FKs on FitEvaluation, Hypothesis, SolutionHypothesis
// (and through them RealityCheck, OnePager) clean up dependents. Caller is
// responsible for confirming the card is archived first — see API route guard.
export async function hardDeleteProblemCard(id: string): Promise<void> {
  await prisma.problemCard.delete({ where: { id } });
}

// Returns child counts + archive status. Used by the API to gate hard delete
// (must be archived) and by the UI to show a "this will also delete N…"
// preview in the confirm modal.
export async function getProblemCardDeletionPreview(
  id: string,
): Promise<{
  archivedAt: Date | null;
  solutionCount: number;
  hypothesisCount: number;
  realityCheckCount: number;
  onePagerCount: number;
} | null> {
  const card = await prisma.problemCard.findUnique({
    where: { id },
    select: {
      archivedAt: true,
      _count: {
        select: { hypotheses: true, solutionHypotheses: true },
      },
      solutionHypotheses: {
        select: {
          _count: { select: { realityChecks: true } },
          onePager: { select: { id: true } },
        },
      },
    },
  });
  if (!card) return null;
  let realityCheckCount = 0;
  let onePagerCount = 0;
  for (const s of card.solutionHypotheses) {
    realityCheckCount += s._count.realityChecks;
    if (s.onePager) onePagerCount += 1;
  }
  return {
    archivedAt: card.archivedAt,
    solutionCount: card._count.solutionHypotheses,
    hypothesisCount: card._count.hypotheses,
    realityCheckCount,
    onePagerCount,
  };
}
