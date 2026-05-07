import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runRealityCheck } from "@/lib/agents/reality-check/run";

const bodySchema = z.object({
  solutionHypothesisId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "solutionHypothesisId is required" }, { status: 400 });
  }
  const { solutionHypothesisId } = parsed.data;

  const solution = await prisma.solutionHypothesis.findUnique({
    where: { id: solutionHypothesisId },
    include: {
      problemCard: true,
      hypotheses: { orderBy: { axis: "asc" } },
      onePager: true,
    },
  });
  if (!solution) {
    return NextResponse.json({ error: "Solution not found" }, { status: 404 });
  }

  let result;
  try {
    result = await runRealityCheck({
      card: solution.problemCard,
      solution,
      hypotheses: solution.hypotheses,
      onePager: solution.onePager,
    });
  } catch (e) {
    console.error("[reality-check] runRealityCheck failed:", e);
    return NextResponse.json(
      { error: "Reality Check failed", message: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  // Each persona slot is now a structured object; serialize into the
  // existing String columns so the schema stays unchanged. UI parses on read
  // (with a fallback to legacy free-text rows).
  const check = await prisma.realityCheck.create({
    data: {
      solutionHypothesisId,
      coldInvestor: JSON.stringify(result.coldInvestor),
      honestFriend: JSON.stringify(result.honestFriend),
      socraticQ: JSON.stringify(result.socraticQ),
      moderatorSummary: JSON.stringify(result.moderatorSummary),
      inputContext: result.inputContext,
    },
  });

  return NextResponse.json(check);
}
