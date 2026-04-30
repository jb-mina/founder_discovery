import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOnePagerComposer } from "@/lib/agents/one-pager-composer/run";
import { upsertOnePagerDraft } from "@/lib/db/one-pager";

// Generate a fresh AI draft for the given solution's 1-pager. Server-side
// always overwrites — the UI is responsible for showing a confirm dialog
// when an existing draft or user edits would be replaced.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ solutionHypothesisId: string }> },
) {
  const { solutionHypothesisId } = await params;

  const solution = await prisma.solutionHypothesis.findUnique({
    where: { id: solutionHypothesisId },
    include: {
      problemCard: true,
      hypotheses: { orderBy: { axis: "asc" } },
    },
  });
  if (!solution) {
    return NextResponse.json(
      { error: "Solution not found" },
      { status: 404 },
    );
  }

  let draft;
  try {
    draft = await runOnePagerComposer({
      card: solution.problemCard,
      solution,
      hypotheses: solution.hypotheses,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Composer failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  const saved = await upsertOnePagerDraft(solutionHypothesisId, draft);
  return NextResponse.json(saved);
}
